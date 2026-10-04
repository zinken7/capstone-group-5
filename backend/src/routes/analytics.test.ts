import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

describe('GET /api/analytics/summary', () => {
  it('returns total machines, sites and countries over verified deployments', async () => {
    const response = await request(app).get('/api/analytics/summary')

    expect(response.status).toBe(200)
    // Deployment 12 (8 machines, Kalgoorlie) is pending_review and excluded
    expect(response.body).toEqual({ machine_count: 121, site_count: 2, country_count: 1 })
  })

  it('applies the shared filters', async () => {
    const response = await request(app).get('/api/analytics/summary?supplier=RCT')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ machine_count: 5, site_count: 1, country_count: 1 })
  })

  it('returns zeros when nothing matches', async () => {
    const response = await request(app).get('/api/analytics/summary?country=CA')

    expect(response.body).toEqual({ machine_count: 0, site_count: 0, country_count: 0 })
  })

  it('rejects a repeated filter parameter', async () => {
    const response = await request(app).get('/api/analytics/summary?status=operational&status=announced')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid status parameter' })
  })
})
