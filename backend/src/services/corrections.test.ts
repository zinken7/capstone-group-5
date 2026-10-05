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
async function waitForLockWaiters(client: Client, count: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { rows } = await client.query<{ waiting: number }>(
      `SELECT COUNT(*)::int AS waiting FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    )
    if ((rows[0]?.waiting ?? 0) >= count) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`expected ${count} sessions waiting on a lock`)
}

async function deployment10() {
  const [row] = await query<{ quantity: number; verification_status: string }>(
    'SELECT quantity, verification_status::text FROM deployment WHERE id = 10',
  )
  return row
}

describe('correctDeployment', () => {
  it('rolls back the revision, contributor and evidence when the update fails', async () => {
    const correction = input({
      quantity: 5,
      evidence_urls: ['https://example.com/new'],
      contributor_email: 'analyst@example.com',
      change_note: 'Fleet reduced',
    })

    // Bypasses validation so the deployment CHECK (quantity > 0) fails after the contributor and revision inserts
    await expect(correctDeployment(10, { ...correction, changes: { quantity: 0 } })).rejects.toThrow('deployment_quantity_check')

    expect(await deployment10()).toEqual({ quantity: 96, verification_status: 'verified' })
    expect(await query('SELECT id FROM revision WHERE deployment_id = 10')).toEqual([])
    expect(await query('SELECT id FROM contributor')).toEqual([])
    expect(await query('SELECT url FROM evidence WHERE deployment_id = 10')).toEqual([{ url: 'https://example.com/evidence/10' }])
  })

  it('applies concurrent corrections one after another without losing either', async () => {
    // Hold the row so both corrections are in flight together before either can proceed
    const holder = new Client({ connectionString: config.databaseUrl })
    await holder.connect()
    let outcomes
    try {
      await holder.query('BEGIN')
      await holder.query('SELECT id FROM deployment WHERE id = 10 FOR UPDATE')
      const pending = Promise.all([
        correctDeployment(10, input({ quantity: 100 })),
        correctDeployment(10, input({ quantity: 120 })),
      ])
      await waitForLockWaiters(holder, 2)
      await holder.query('COMMIT')
      outcomes = await pending
    } finally {
      await holder.end()
    }
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(['updated', 'updated'])

    const revisions = await query<{ previous_values: { quantity: number; verification_status: string } }>(
      'SELECT previous_values FROM revision WHERE deployment_id = 10 ORDER BY id',
    )
    const final = (await deployment10())?.quantity
    // The second revision must see the first correction's value, not the original 96
    expect(revisions.map((revision) => revision.previous_values)).toEqual([
      { quantity: 96, verification_status: 'verified' },
      { quantity: final === 100 ? 120 : 100, verification_status: 'pending_review' },
    ])
    // Longer than the 10 s lock-wait poll, so a slow database fails with its message instead of a timeout
  }, 15_000)
})
