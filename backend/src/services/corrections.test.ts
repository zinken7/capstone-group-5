import { Client } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { config } = await import('../config.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { validateCorrection } = await import('../lib/correction-validation.js')
const { correctDeployment } = await import('./corrections.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

function input(body: Record<string, unknown>) {
  const result = validateCorrection({ disclosure_accepted: true, ...body })
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.value
}

/** Polls until the given number of sessions are blocked on a row lock. */
async function waitForLockWaiters(count: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    // Pool queries autocommit; inside one transaction pg_stat_activity would stay a frozen snapshot
    const rows = await query<{ waiting: number }>(
      `SELECT COUNT(*)::int AS waiting FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    )
    if ((rows[0]?.waiting ?? 0) >= count) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`expected ${count} sessions waiting on a lock`)
}

async function deployment(id: number) {
  const [row] = await query<{ quantity: number; verification_status: string }>(
    'SELECT quantity, verification_status::text FROM deployment WHERE id = $1',
    [id],
  )
  return row
}

/** Starts two corrections to one deployment while its row is held, so both wait on the same lock. */
async function concurrently<T>(id: number, run: () => Promise<T>[]): Promise<T[]> {
  const holder = new Client({ connectionString: config.databaseUrl })
  await holder.connect()
  try {
    await holder.query('BEGIN')
    await holder.query('SELECT id FROM deployment WHERE id = $1 FOR UPDATE', [id])
    const pending = Promise.all(run())
    await waitForLockWaiters(2)
    await holder.query('COMMIT')
    return await pending
  } finally {
    await holder.end()
  }
}

// Deployment 12 is pending review, so it is corrected directly; 10 is verified, so it gets proposals
describe('correctDeployment', () => {
  it('rolls back the revision, contributor and evidence when the update fails', async () => {
    const correction = input({
      quantity: 5,
      evidence_urls: ['https://example.com/new'],
      contributor_email: 'analyst@example.com',
      change_note: 'Fleet reduced',
    })

    // Bypasses validation so the deployment CHECK (quantity > 0) fails after the contributor and revision inserts
    await expect(correctDeployment(12, { ...correction, changes: { quantity: 0 } })).rejects.toThrow('deployment_quantity_check')

    expect(await deployment(12)).toEqual({ quantity: 8, verification_status: 'pending_review' })
    expect(await query('SELECT id FROM revision WHERE deployment_id = 12')).toEqual([])
    expect(await query('SELECT id FROM contributor')).toEqual([])
    expect(await query('SELECT url FROM evidence WHERE deployment_id = 12')).toEqual([])
  })

  it('applies concurrent corrections one after another without losing either', async () => {
    const outcomes = await concurrently(12, () => [
      correctDeployment(12, input({ quantity: 100 })),
      correctDeployment(12, input({ quantity: 120 })),
    ])
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(['updated', 'updated'])

    const revisions = await query<{ previous_values: { quantity: number; verification_status: string } }>(
      'SELECT previous_values FROM revision WHERE deployment_id = 12 ORDER BY id',
    )
    const final = (await deployment(12))?.quantity
    // The second revision must see the first correction's value, not the original 8
    expect(revisions.map((revision) => revision.previous_values)).toEqual([
      { quantity: 8, verification_status: 'pending_review' },
      { quantity: final === 100 ? 120 : 100, verification_status: 'pending_review' },
    ])
    // Longer than the 10 s lock-wait poll, so a slow database fails with its message instead of a timeout
  }, 15_000)

  it('keeps concurrent corrections to a verified record as separate proposals', async () => {
    const outcomes = await concurrently(10, () => [
      correctDeployment(10, input({ quantity: 100 })),
      correctDeployment(10, input({ quantity: 120 })),
    ])
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(['proposed', 'proposed'])

    expect(await deployment(10)).toEqual({ quantity: 96, verification_status: 'verified' })
    const proposals = await query<{ proposed_values: { quantity: number }; base_values: { quantity: number } }>(
      'SELECT proposed_values, base_values FROM deployment_correction WHERE deployment_id = 10 ORDER BY id',
    )
    expect(proposals.map((proposal) => proposal.base_values)).toEqual([{ quantity: 96 }, { quantity: 96 }])
    expect(proposals.map((proposal) => proposal.proposed_values.quantity).sort()).toEqual([100, 120])
  }, 15_000)
})
