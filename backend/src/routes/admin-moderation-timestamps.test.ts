import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { signedInAdmin } = await import('../test/admin.js')

let cookie: string

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
  ;({ cookie } = await signedInAdmin(app))
  await query("INSERT INTO evidence (deployment_id, url, source_type) VALUES (12, 'https://example.com/evidence/12', 'news')")
})

afterAll(async () => {
  await closeDatabase()
})

/**
 * res.json used to serialise pg's Date values, so every timestamp went out as
 * ISO 8601 UTC with milliseconds. The Drizzle queries format in SQL instead
 * and must keep that exact shape.
 */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe('moderation timestamps', () => {
  it('serialises every timestamp as ISO 8601 UTC with milliseconds', async () => {
    const queue = await request(app).get('/api/admin/reviews').set('Cookie', cookie)
    expect(queue.status).toBe(200)
    const item = (queue.body.items as { id: number; submitted_at: string }[]).find((entry) => entry.id === 12)
    expect(item?.submitted_at).toMatch(ISO_UTC)

    const decided = await request(app)
      .post('/api/admin/deployments/12/reviews')
      .set('Cookie', cookie)
      .set('X-Requested-With', 'fetch')
      .send({ decision: 'approved' })
    expect(decided.status).toBe(201)

    const detail = await request(app).get('/api/admin/deployments/12').set('Cookie', cookie)
    expect(detail.status).toBe(200)
    expect(detail.body.created_at).toMatch(ISO_UTC)
    expect(detail.body.updated_at).toMatch(ISO_UTC)

    const reviews = detail.body.reviews as { reviewed_at: string }[]
    expect(reviews).toHaveLength(1)
    expect(reviews[0]?.reviewed_at).toMatch(ISO_UTC)

    const revisions = detail.body.revisions as { changed_at: string }[]
    expect(revisions.length).toBeGreaterThan(0)
    for (const revision of revisions) expect(revision.changed_at).toMatch(ISO_UTC)
  })
})
