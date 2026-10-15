import { Client } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { config } = await import('../config.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { createContributionKey } = await import('../lib/contribution-key.js')
const { validateCorrection } = await import('../lib/correction-validation.js')
const { updateOwnContribution } = await import('./contributor-access.js')

// Deployment 12 stands in for a submission sent back for changes, with a key of its own
let key: string

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
  const created = createContributionKey()
  key = created.key
  await query('INSERT INTO contribution_key (deployment_id, key_hash) VALUES (12, $1)', [created.hash])
  await query("UPDATE deployment SET verification_status = 'changes_requested' WHERE id = 12")
})

afterAll(async () => {
  await closeDatabase()
})

function input(body: Record<string, unknown>) {
  const result = validateCorrection({ disclosure_accepted: true, ...body })
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.value
}

async function deployment(id: number) {
  const [row] = await query<{ quantity: number; verification_status: string }>(
    'SELECT quantity, verification_status::text FROM deployment WHERE id = $1',
    [id],
  )
  return row
}

/** Polls until the given number of sessions are blocked on a row lock. */
async function waitForLockWaiters(count: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rows = await query<{ waiting: number }>(
      `SELECT COUNT(*)::int AS waiting FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    )
    if ((rows[0]?.waiting ?? 0) >= count) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`expected ${count} sessions waiting on a lock`)
}

describe('updateOwnContribution', () => {
  it('rolls back the revision, contributor and evidence when the update fails', async () => {
    const update = input({ quantity: 5, evidence_urls: ['https://example.com/new'], change_note: 'Fleet reduced' })

    // Bypasses validation so the deployment CHECK (quantity > 0) fails after the contributor and revision inserts
    await expect(updateOwnContribution(12, key, { ...update, changes: { quantity: 0 } })).rejects.toThrow('deployment_quantity_check')

    expect(await deployment(12)).toEqual({ quantity: 8, verification_status: 'changes_requested' })
    expect(await query('SELECT id FROM revision WHERE deployment_id = 12')).toEqual([])
    expect(await query('SELECT id FROM contributor')).toEqual([])
    expect(await query('SELECT url FROM evidence WHERE deployment_id = 12')).toEqual([])
  })

  it('applies one of two updates sent at once and refuses the other, which finds the record back in review', async () => {
    const holder = new Client({ connectionString: config.databaseUrl })
    await holder.connect()
    try {
      await holder.query('BEGIN')
      await holder.query('SELECT id FROM deployment WHERE id = 12 FOR UPDATE')
      const pending = Promise.all([
        updateOwnContribution(12, key, input({ quantity: 100 })),
        updateOwnContribution(12, key, input({ quantity: 120 })),
      ])
      await waitForLockWaiters(2)
      await holder.query('COMMIT')
      const outcomes = await pending

      expect(outcomes.map((outcome) => outcome.kind).sort()).toEqual(['not_open', 'updated'])
      const applied = outcomes.find((outcome) => outcome.kind === 'updated')
      expect(applied).toBeDefined()
      const final = (await deployment(12))?.quantity
      expect([100, 120]).toContain(final)
      expect(await query<{ previous_values: unknown }>("SELECT previous_values FROM revision WHERE deployment_id = 12 AND action = 'update'"))
        .toEqual([{ previous_values: { quantity: 8, verification_status: 'changes_requested' } }])
    } finally {
      await holder.end()
    }
    // Longer than the 10 s lock-wait poll, so a slow database fails with its message instead of a timeout
  }, 15_000)
})
