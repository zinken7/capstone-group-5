import { readFile } from 'node:fs/promises'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { createAdmin } = await import('../services/admin-auth.js')

const MOVE_RECORDS = await readFile(new URL('../../migrations/007_move_needs_changes_records.sql', import.meta.url), 'utf8')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

async function decide(deploymentId: number, adminId: number, decision: string, reviewedAt: string, correctionId: number | null = null) {
  await query(
    `INSERT INTO verification_review (deployment_id, admin_user_id, decision, review_note, reviewed_at, correction_id)
     VALUES ($1, $2, $3, 'note', $4, $5)`,
    [deploymentId, adminId, decision, reviewedAt, correctionId],
  )
}

async function stateOf(id: number) {
  const [row] = await query<{ verification_status: string; updated_at: string }>(
    'SELECT verification_status::text, updated_at::text FROM deployment WHERE id = $1',
    [id],
  )
  return row
}

describe('migration 007: records sent back for changes before the new status', () => {
  it('moves only records whose latest decision on the record is needs_changes, keeping their update time', async () => {
    const admin = await createAdmin('migration@example.com', 'admin')
    if (admin.kind !== 'created') throw new Error('admin not created')
    // 12 was sent back for changes; 11 was sent back and later approved; 14 was loaded without review
    await decide(12, admin.id, 'needs_changes', '2026-09-02T00:00:00Z')
    await decide(11, admin.id, 'needs_changes', '2026-09-02T00:00:00Z')
    await decide(11, admin.id, 'approved', '2026-09-03T00:00:00Z')
    await query("UPDATE deployment SET verification_status = 'unverified' WHERE id IN (11, 12, 14)")
    const before = await stateOf(12)

    await query(MOVE_RECORDS)

    expect(await stateOf(12)).toEqual({ verification_status: 'changes_requested', updated_at: before?.updated_at })
    expect((await stateOf(11))?.verification_status).toBe('unverified')
    expect((await stateOf(14))?.verification_status).toBe('unverified')
    // The timestamp trigger is back on for later changes
    await query('UPDATE deployment SET quantity = quantity + 1 WHERE id = 12')
    expect((await stateOf(12))?.updated_at).not.toBe(before?.updated_at)
  })
})
