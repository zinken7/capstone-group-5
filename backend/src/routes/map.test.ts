import request from 'supertest'
import { describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test'

const { default: app } = await import('../app.js')

function siteIds(features: Array<{ properties: { id: number } }>): number[] {
  return features.map((feature) => feature.properties.id).sort((a, b) => a - b)
}

describe('GET /api/map', () => {
  it('only returns deployments that are verified', async () => {
    const response = await request(app).get('/api/map')

    expect(response.status).toBe(200)
    // Site 3 (Kalgoorlie Super Pit) has only a pending_review deployment, per FR-43.
    expect(siteIds(response.body.features)).toEqual([1, 2])
  })

  it('answers a historical date from the deployment validity period, not current status', async () => {
    const response = await request(app).get('/api/map?date=2018-01-01')

    expect(response.status).toBe(200)
    // Site 1 is included via deployment 14, which is decommissioned *today*
    // but was in service 2015-03-01..2020-12-31 — the queried date falls inside that window.
    const royHill = response.body.features.find((feature: { properties: { id: number } }) => feature.properties.id === 1)
    expect(royHill).toBeDefined()
    expect(royHill.properties.status).toBe('decommissioned')

    // Sites 2 and 3 have no commissioning date, so they cannot be placed on the timeline at all.
    expect(siteIds(response.body.features)).toEqual([1])
  })

  it('returns a different status for the same site once the date moves past that deployment', async () => {
    const response = await request(app).get('/api/map?date=2022-06-01')

    expect(response.status).toBe(200)
    const royHill = response.body.features.find((feature: { properties: { id: number } }) => feature.properties.id === 1)
    // Deployment 14 ended 2020-12-31; deployment 10 started 2021-01-01 and is still open.
    expect(royHill).toBeDefined()
    expect(royHill.properties.status).toBe('operational')
  })

  it('states how many deployments were excluded for lacking a commissioning date', async () => {
    const response = await request(app).get('/api/map?date=2018-01-01')

    expect(response.status).toBe(200)
    // Deployment 11 (Mount Whaleback) has no commissioning date.
    expect(response.body.excluded_count).toBe(1)
  })

  it('rejects a malformed bbox parameter', async () => {
    const response = await request(app).get('/api/map?bbox=bad')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid bbox parameter' })
  })

  it('rejects a malformed date parameter', async () => {
    const response = await request(app).get('/api/map?date=not-a-date')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid date parameter' })
  })
})
