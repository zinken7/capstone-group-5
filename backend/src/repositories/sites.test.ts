import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { findMapSites, findSiteById, findVerifiedDeploymentsBySite } = await import('./sites.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

const noFilters = { bbox: null }

describe('findMapSites', () => {
  it('returns only sites with verified deployments', async () => {
    const result = await findMapSites(noFilters)

    // Site 3 has only a pending_review deployment (FR-43)
    expect(result.sites.map((site) => site.id)).toEqual([1, 2])
    expect(result.excludedCount).toBe(0)
  })

  it('returns coordinates, derived status and distinct suppliers per site', async () => {
    const result = await findMapSites(noFilters)
    const royHill = result.sites.find((site) => site.id === 1)

    expect(royHill).toMatchObject({
      name: 'Roy Hill',
      longitude: 118.7,
      latitude: -22.3,
      status: 'operational',
      technologySuppliers: ['Caterpillar'],
    })
  })

  it('filters by bounding box using the site geometry', async () => {
    // Box around Kalgoorlie only; site 3 is unverified so nothing returns
    const kalgoorlie = await findMapSites({ bbox: { minLon: 121, minLat: -31, maxLon: 122, maxLat: -30 } })
    expect(kalgoorlie.sites).toEqual([])

    const pilbara = await findMapSites({ bbox: { minLon: 118, minLat: -24, maxLon: 120, maxLat: -22 } })
    expect(pilbara.sites.map((site) => site.id)).toEqual([1, 2])
  })

  it('filters by site attributes', async () => {
    expect((await findMapSites({ ...noFilters, country: 'AU' })).sites).toHaveLength(2)
    expect((await findMapSites({ ...noFilters, country: 'CA' })).sites).toHaveLength(0)
    expect((await findMapSites({ ...noFilters, region: 'Pilbara' })).sites.map((site) => site.id)).toEqual([1, 2])
    expect((await findMapSites({ ...noFilters, commodity: 'gold' })).sites).toHaveLength(0)
  })

  it('filters by deployment attributes', async () => {
    expect((await findMapSites({ ...noFilters, supplier: 'RCT' })).sites.map((site) => site.id)).toEqual([2])
    expect((await findMapSites({ ...noFilters, machineType: 'drill' })).sites.map((site) => site.id)).toEqual([2])
    expect((await findMapSites({ ...noFilters, automationLevel: 'autonomous' })).sites.map((site) => site.id)).toEqual([1])
    expect((await findMapSites({ ...noFilters, environment: 'underground' })).sites).toHaveLength(0)
    // A value outside the enum matches nothing rather than erroring
    expect((await findMapSites({ ...noFilters, machineType: 'spaceship' })).sites).toHaveLength(0)
  })

  it('answers a historical date from the validity period and counts undated deployments', async () => {
    const result = await findMapSites({ ...noFilters, date: '2018-01-01' })

    // Deployment 14 is decommissioned now but was in service in 2018
    expect(result.sites.map((site) => site.id)).toEqual([1])
    expect(result.sites[0]?.status).toBe('decommissioned')
    // Deployment 11 has no commissioning date
    expect(result.excludedCount).toBe(1)
  })

  it('moves to the later deployment once the date passes the earlier one', async () => {
    const result = await findMapSites({ ...noFilters, date: '2022-06-01' })

    expect(result.sites.find((site) => site.id === 1)?.status).toBe('operational')
  })
})

describe('findSiteById', () => {
  it('returns the site with region name and split coordinates', async () => {
    expect(await findSiteById(1)).toEqual({
      id: 1,
      name: 'Roy Hill',
      countryCode: 'AU',
      region: 'Pilbara',
      commodity: 'iron_ore',
      mineStatus: 'operating',
      latitude: -22.3,
      longitude: 118.7,
    })
  })

  it('returns null for an unknown id', async () => {
    expect(await findSiteById(999)).toBeNull()
  })
})

describe('findVerifiedDeploymentsBySite', () => {
  it('returns verified deployments with resolved manufacturer and supplier', async () => {
    const deployments = await findVerifiedDeploymentsBySite(1)

    expect(deployments.map((deployment) => deployment.id)).toEqual([10, 14])
    expect(deployments[0]).toEqual({
      id: 10,
      machineManufacturer: 'Caterpillar',
      machineModel: 'Caterpillar 793F',
      machineType: 'haul_truck',
      quantity: 96,
      technologySupplier: 'Caterpillar',
      automationLevel: 'autonomous',
      environment: 'surface',
      status: 'operational',
      commissioningDate: '2021-01-01',
      validFrom: '2021-01-01',
      validTo: null,
    })
    expect(deployments[1]?.automationLevel).toBeNull()
    expect(deployments[1]?.validTo).toBe('2020-12-31')
  })

  it('returns an empty list when the only deployment is not verified', async () => {
    expect(await findVerifiedDeploymentsBySite(3)).toEqual([])
  })
})
