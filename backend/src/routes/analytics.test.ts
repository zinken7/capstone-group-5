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

  it('applies site_id like the other shared filters', async () => {
    const response = await request(app).get('/api/analytics/summary?site_id=1')

    expect(response.body).toEqual({ machine_count: 116, site_count: 1, country_count: 1 })
  })

  it('applies the commissioning year range', async () => {
    // Deployment 10 (96 machines) was commissioned in 2021, deployment 14 (20) in 2015, and deployment 11 (5) has no year
    const from = await request(app).get('/api/analytics/summary?commissioned_from=2016')
    expect(from.body).toEqual({ machine_count: 96, site_count: 1, country_count: 1 })

    const to = await request(app).get('/api/analytics/summary?commissioned_to=2016')
    expect(to.body).toEqual({ machine_count: 20, site_count: 1, country_count: 1 })

    const both = await request(app).get('/api/analytics/summary?commissioned_from=2015&commissioned_to=2021')
    expect(both.body.machine_count).toBe(116)
  })

  it('rejects a commissioning year that is not four digits', async () => {
    const response = await request(app).get('/api/analytics/summary?commissioned_from=21')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid commissioned_from parameter' })
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

describe('GET /api/analytics/breakdowns', () => {
  it('returns machine counts and shares for each breakdown', async () => {
    const response = await request(app).get('/api/analytics/breakdowns')

    expect(response.status).toBe(200)
    expect(response.body.machine_count).toBe(121)
    expect(response.body.by_country).toEqual([{ key: 'AU', machine_count: 121, share: 1 }])
    expect(response.body.by_supplier[0]).toEqual({ key: 'Caterpillar', machine_count: 116, share: 116 / 121 })
    expect(response.body.by_manufacturer.map((item: { key: string }) => item.key)).toEqual(['Caterpillar', 'Sandvik'])
    expect(response.body.by_machine_type.map((item: { key: string }) => item.key)).toEqual(['haul_truck', 'drill'])
    expect(response.body.by_automation_level.at(-1)).toEqual({ key: null, machine_count: 20, share: 20 / 121 })
    expect(response.body.by_status).toEqual([
      { key: 'operational', machine_count: 96, share: 96 / 121 },
      { key: 'decommissioned', machine_count: 20, share: 20 / 121 },
      { key: 'commissioning', machine_count: 5, share: 5 / 121 },
    ])
    expect(response.body.by_commodity).toEqual([{ key: 'iron_ore', machine_count: 121, share: 1 }])
  })

  it('ranks manufacturers and suppliers within a machine type', async () => {
    const response = await request(app).get('/api/analytics/breakdowns?machine_type=drill')

    expect(response.body.machine_count).toBe(5)
    expect(response.body.by_manufacturer).toEqual([{ key: 'Sandvik', machine_count: 5, share: 1 }])
    expect(response.body.by_supplier).toEqual([{ key: 'RCT', machine_count: 5, share: 1 }])
  })

  it('rejects a repeated filter parameter', async () => {
    const response = await request(app).get('/api/analytics/breakdowns?country=AU&country=CA')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid country parameter' })
  })
})

describe('GET /api/analytics/timeline', () => {
  it('returns yearly commissioned and in-service counts with the excluded totals', async () => {
    const response = await request(app).get('/api/analytics/timeline')

    expect(response.status).toBe(200)
    expect(response.body.excluded_count).toBe(1)
    expect(response.body.excluded_machine_count).toBe(5)
    expect(response.body.years[0]).toEqual({ year: 2015, newly_commissioned: 20, in_service: 20 })
    expect(response.body.years.find((row: { year: number }) => row.year === 2021)).toEqual({
      year: 2021,
      newly_commissioned: 96,
      in_service: 96,
    })
  })

  it('returns an empty series when no dated deployment matches', async () => {
    const response = await request(app).get('/api/analytics/timeline?country=CA')

    expect(response.body).toEqual({ excluded_count: 0, excluded_machine_count: 0, years: [] })
  })

  it('rejects a repeated filter parameter', async () => {
    const response = await request(app).get('/api/analytics/timeline?supplier=RCT&supplier=Caterpillar')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid supplier parameter' })
  })
})

describe('GET /api/analytics/crosstab', () => {
  it('returns machine counts for each pair of groups, largest first', async () => {
    const response = await request(app).get('/api/analytics/crosstab?rows=manufacturer&columns=machine_type')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      rows: 'manufacturer',
      columns: 'machine_type',
      machine_count: 121,
      cells: [
        { row: 'Caterpillar', column: 'haul_truck', machine_count: 116 },
        { row: 'Sandvik', column: 'drill', machine_count: 5 },
      ],
    })
  })

  it('groups by commissioning year as the timeline does, keeping undated machines under a null year', async () => {
    const response = await request(app).get('/api/analytics/crosstab?rows=commissioning_year&columns=automation_level')

    expect(response.status).toBe(200)
    expect(response.body.machine_count).toBe(121)
    expect(response.body.cells).toEqual([
      { row: '2021', column: 'autonomous', machine_count: 96 },
      { row: '2015', column: null, machine_count: 20 },
      { row: null, column: 'teleremote', machine_count: 5 },
    ])
  })

  it('applies the shared filters', async () => {
    const response = await request(app).get('/api/analytics/crosstab?rows=supplier&columns=environment&machine_type=drill')

    expect(response.body).toEqual({
      rows: 'supplier',
      columns: 'environment',
      machine_count: 5,
      cells: [{ row: 'RCT', column: 'surface', machine_count: 5 }],
    })
  })

  it('rejects an unknown or repeated dimension', async () => {
    const unknown = await request(app).get('/api/analytics/crosstab?rows=site&columns=country')
    expect(unknown.status).toBe(400)
    expect(unknown.body).toEqual({ error: 'invalid rows parameter' })

    const missing = await request(app).get('/api/analytics/crosstab?rows=country')
    expect(missing.status).toBe(400)
    expect(missing.body).toEqual({ error: 'invalid columns parameter' })

    const same = await request(app).get('/api/analytics/crosstab?rows=country&columns=country')
    expect(same.status).toBe(400)
    expect(same.body).toEqual({ error: 'invalid columns parameter' })

    const repeated = await request(app).get('/api/analytics/crosstab?rows=country&rows=supplier&columns=machine_type')
    expect(repeated.status).toBe(400)
    expect(repeated.body).toEqual({ error: 'invalid rows parameter' })
  })

  it('rejects a repeated filter parameter', async () => {
    const response = await request(app).get('/api/analytics/crosstab?rows=country&columns=supplier&supplier=RCT&supplier=Caterpillar')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid supplier parameter' })
  })
})
