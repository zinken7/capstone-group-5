import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { countRegisterRows, findRegisterRows, summariseDeployments } = await import('./deployments.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

const bySite = { sort: 'site', order: 'asc' } as const

async function ids(filters: Parameters<typeof findRegisterRows>[0], options: Parameters<typeof findRegisterRows>[1] = bySite) {
  return (await findRegisterRows(filters, options)).map((row) => row.id)
}

describe('findRegisterRows', () => {
  it('returns verified deployments only, flattened with site and company names', async () => {
    const rows = await findRegisterRows({}, bySite)

    // Deployment 12 is pending_review (FR-43)
    expect(rows.map((row) => row.id)).toEqual([11, 10, 14])
    expect(rows[1]).toEqual({
      id: 10,
      siteId: 1,
      siteName: 'Roy Hill',
      countryCode: 'AU',
      region: 'Pilbara',
      commodity: 'iron_ore',
      machineManufacturer: 'Caterpillar',
      machineModel: 'Caterpillar 793F',
      modelVariant: 'base',
      machineType: 'haul_truck',
      quantity: 96,
      technologySupplier: 'Caterpillar',
      technologyProduct: 'Cat MineStar Command for hauling',
      automationLevel: 'autonomous',
      environment: 'surface',
      installationType: 'unknown',
      status: 'operational',
      commissioningDate: '2021-01-01',
      commissioningYear: 2021,
      validFrom: '2021-01-01',
      validTo: null,
    })
  })

  it('applies each filter', async () => {
    expect(await ids({ manufacturer: 'Sandvik' })).toEqual([11])
    expect(await ids({ supplier: 'Caterpillar' })).toEqual([10, 14])
    expect(await ids({ status: 'decommissioned' })).toEqual([14])
    expect(await ids({ automationLevel: 'autonomous' })).toEqual([10])
    expect(await ids({ machineType: 'drill' })).toEqual([11])
    expect(await ids({ environment: 'surface', region: 'Pilbara', commodity: 'iron_ore' })).toEqual([11, 10, 14])
    expect(await ids({ country: 'CA' })).toEqual([])
    expect(await ids({ machineType: 'spaceship' })).toEqual([])
  })

  it('searches site, model, manufacturer, supplier and product names case-insensitively', async () => {
    expect(await ids({ q: 'whale' })).toEqual([11])
    expect(await ids({ q: 'MINESTAR' })).toEqual([10, 14])
    expect(await ids({ q: '777' })).toEqual([14])
  })

  it('treats LIKE wildcards in the search text literally', async () => {
    expect(await ids({ q: '%' })).toEqual([])
    expect(await ids({ q: '_' })).toEqual([])
  })

  it('sorts by the requested column and keeps missing values last', async () => {
    expect(await ids({}, { sort: 'quantity', order: 'desc' })).toEqual([10, 14, 11])
    expect(await ids({}, { sort: 'commissioning', order: 'asc' })).toEqual([14, 10, 11])
    expect(await ids({}, { sort: 'commissioning', order: 'desc' })).toEqual([10, 14, 11])
  })

  it('pages through the sorted result', async () => {
    expect(await ids({}, { ...bySite, page: { limit: 2, offset: 1 } })).toEqual([10, 14])
    expect(await ids({}, { ...bySite, page: { limit: 2, offset: 5 } })).toEqual([])
  })
})

describe('countRegisterRows', () => {
  it('counts the filtered verified deployments', async () => {
    expect(await countRegisterRows({})).toBe(3)
    expect(await countRegisterRows({ supplier: 'Caterpillar' })).toBe(2)
  })
})

describe('summariseDeployments', () => {
  it('returns total machines, sites and countries for verified deployments', async () => {
    expect(await summariseDeployments({})).toEqual({ machineCount: 121, siteCount: 2, countryCount: 1 })
  })

  it('applies the same filters as the register', async () => {
    expect(await summariseDeployments({ supplier: 'RCT' })).toEqual({ machineCount: 5, siteCount: 1, countryCount: 1 })
    expect(await summariseDeployments({ country: 'CA' })).toEqual({ machineCount: 0, siteCount: 0, countryCount: 0 })
  })
})
