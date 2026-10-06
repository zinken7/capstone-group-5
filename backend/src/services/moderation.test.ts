import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Make the last write of a decision fail, to show that the earlier ones roll back
vi.mock('../repositories/contributions.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../repositories/contributions.js')>()
  return {
    ...actual,
    insertRevision: vi.fn(async () => {
      throw new Error('revision insert failed')
    }),
  }
})

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { createAdmin } = await import('./admin-auth.js')
const { decide } = await import('./moderation.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
  await query("INSERT INTO evidence (deployment_id, url, source_type) VALUES (12, 'https://example.com/evidence/12', 'news')")
})

afterAll(async () => {
  await closeDatabase()
})

describe('decide', () => {
  it('rolls back the review and the status change when a later write fails', async () => {
    const created = await createAdmin('reviewer@example.com', 'admin')
    if (created.kind !== 'created') throw new Error('admin was not created')

    await expect(decide(12, created.id, { decision: 'approved', note: null })).rejects.toThrow('revision insert failed')

    expect(await query("SELECT verification_status::text AS status FROM deployment WHERE id = 12")).toEqual([{ status: 'pending_review' }])
    expect(await query('SELECT COUNT(*)::int AS reviews FROM verification_review')).toEqual([{ reviews: 0 }])
  })
})
