import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

function siteIds(features: Array<{ properties: { id: number } }>): number[] {
  return features.map((feature) => feature.properties.id).sort((a, b) => a - b)
}

describe('GET /api/map', () => {
  it('shows and filters by the supplier of a deployment that names no product', async () => {
    // Deployment 11 is commissioning, which the map leaves out (FR-16), so mark it operational here
    await query("UPDATE deployment SET technology_product_id = NULL, status = 'operational' WHERE id = 11")

    const response = await request(app).get('/api/map?supplier=RCT')
    expect(response.status).toBe(200)
    expect(response.body.features.map((feature: { properties: { id: number; technology_suppliers: string[] } }) => feature.properties))
      .toEqual([expect.objectContaining({ id: 2, technology_suppliers: ['RCT'] })])
  })

  it('only returns deployments that are verified', async () => {
    const response = await request(app).get('/api/map')

    expect(response.status).toBe(200)
    // Site 3 (Kalgoorlie Super Pit) has only a pending_review deployment, per FR-43.
    expect(siteIds(response.body.features)).toEqual([1])
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
    expect(response.body.excluded_count).toBe(0)
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

type Feature = { properties: { id: number; status: string | null; machine_count: number; deployment_count: number } }

function site(features: Feature[], id: number) {
  return features.find((feature) => feature.properties.id === id)?.properties
}

describe('GET /api/map site properties', () => {
  it('describes each site and counts the machines and deployments in view', async () => {
    const response = await request(app).get('/api/map')

    expect(response.body.features[0].properties).toEqual({
      id: 1,
      name: 'Roy Hill',
      country_code: 'AU',
      region: 'Pilbara',
      commodity: 'iron_ore',
      status: 'operational',
      technology_suppliers: ['Caterpillar'],
      // Deployments 10 (96) and 14 (20): with no date or year, every verified deployment counts
      machine_count: 96,
      deployment_count: 1,
    })
    expect(site(response.body.features, 2)).toBeUndefined()
  })

  it('counts only the deployments in service on the given date', async () => {
    const response = await request(app).get('/api/map?date=2022-06-01')

    expect(site(response.body.features, 1)).toMatchObject({ status: 'operational', machine_count: 96, deployment_count: 1 })
  })
})

describe('GET /api/map?year=', () => {
  it('shows what was in service on 31 December of the year', async () => {
    const in2020 = await request(app).get('/api/map?year=2020')
    const in2022 = await request(app).get('/api/map?year=2022')

    // Deployment 14 ran until 2020-12-31 inclusive; deployment 10 started in 2021
    expect(siteIds(in2020.body.features)).toEqual([1])
    expect(site(in2020.body.features, 1)).toMatchObject({ status: 'decommissioned', machine_count: 20, deployment_count: 1 })
    expect(site(in2022.body.features, 1)).toMatchObject({ status: 'operational', machine_count: 96, deployment_count: 1 })
    // Deployment 11 has no commissioning year, so it is excluded rather than placed
    expect(siteIds(in2022.body.features)).toEqual([1])
    expect(in2022.body.excluded_count).toBe(0)
  })

  it('places a record known only by its year, which a date cannot', async () => {
    await query('UPDATE deployment SET commissioning_year = 2023 WHERE id = 11')

    const byYear = await request(app).get('/api/map?year=2023')
    const byDate = await request(app).get('/api/map?date=2023-12-31')

    expect(site(byYear.body.features, 2)).toBeUndefined()
    expect(byYear.body.excluded_count).toBe(0)
    expect(site(byDate.body.features, 2)).toBeUndefined()
  })

  it('leaves announced deployments out without counting them as excluded', async () => {
    await query("UPDATE deployment SET status = 'announced' WHERE id = 10")

    const response = await request(app).get('/api/map?year=2022')

    expect(siteIds(response.body.features)).toEqual([])
    expect(response.body.excluded_count).toBe(0)
  })

  it('reconciles historical map totals with timeline totals excluding commissioning machines', async () => {
    await query('UPDATE deployment SET commissioning_year = 2023 WHERE id = 11')
    const timeline = await request(app).get('/api/analytics/timeline')

    for (const { year, in_service: inService } of timeline.body.years as Array<{ year: number; in_service: number }>) {
      const map = await request(app).get(`/api/map?year=${year}`)
      const machines = (map.body.features as Feature[]).reduce((sum, feature) => sum + feature.properties.machine_count, 0)
      const expectedOperationalMachines = year >= 2021 ? 96 : year >= 2015 && year <= 2020 ? 20 : 0
      expect(machines, String(year)).toBe(expectedOperationalMachines)
      const commissioningMachines = year >= 2023 ? 5 : 0
      expect(machines, String(year)).toBe(inService - commissioningMachines)
    }
  })

  it('keeps a site whose deployments had all ended only when decommissioned deployments are included', async () => {
    // Move deployment 10 to 2023, so in 2022 Roy Hill only has deployment 14, which ended in 2020
    await query("UPDATE deployment SET commissioning_date = '2023-01-01', commissioning_year = 2023, valid_from = '2023-01-01' WHERE id = 10")

    const without = await request(app).get('/api/map?year=2022')
    const withEnded = await request(app).get('/api/map?year=2022&include_decommissioned=true')

    expect(site(without.body.features, 1)).toBeUndefined()
    // Ended deployments mark the site but never count as machines in service
    expect(site(withEnded.body.features, 1)).toMatchObject({ status: 'decommissioned', machine_count: 0, deployment_count: 0 })
  })

  it('never treats an announced deployment as ended, even with an old end date', async () => {
    // Only deployment 14 at Roy Hill, recorded as announced with an end date before 2022
    await query("UPDATE deployment SET commissioning_date = '2023-01-01', commissioning_year = 2023, valid_from = '2023-01-01' WHERE id = 10")
    await query("UPDATE deployment SET status = 'announced' WHERE id = 14")

    const response = await request(app).get('/api/map?year=2022&include_decommissioned=true')

    expect(site(response.body.features, 1)).toBeUndefined()
  })

  it('does not let ended deployments change the status of a site that is still in service', async () => {
    const response = await request(app).get('/api/map?year=2022&include_decommissioned=true')

    expect(site(response.body.features, 1)).toMatchObject({ status: 'operational', machine_count: 96, deployment_count: 1 })
  })

  it.each([
    ['year=20x', 'invalid year parameter'],
    ['year=1800', 'invalid year parameter'],
    ['year=2022&date=2022-12-31', 'use either date or year, not both'],
    ['include_decommissioned=yes', 'invalid include_decommissioned parameter'],
  ])('rejects %s', async (search, error) => {
    const response = await request(app).get(`/api/map?${search}`)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error })
  })
})
