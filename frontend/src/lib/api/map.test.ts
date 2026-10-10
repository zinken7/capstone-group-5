import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMap } from './map'
import type { MapResponseDto } from './types'

const fetchMock = vi.fn<typeof fetch>()
const mapDto: MapResponseDto = {
  type: 'FeatureCollection',
  excluded_count: 3,
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [118.7, -22.3] },
    properties: {
      id: 1,
      name: 'Roy Hill',
      country_code: 'AU',
      region: 'Pilbara',
      commodity: 'iron_ore',
      status: 'decommissioned',
      technology_suppliers: ['Caterpillar', 'RCT'],
      machine_count: 20,
      deployment_count: 1,
    },
  }],
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(Response.json(mapDto))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', '/api')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('getMap', () => {
  it('maps GeoJSON coordinates and snake_case fields while preserving backend status', async () => {
    expect(await getMap()).toEqual({
      excludedCount: 3,
      markers: [{
        id: 1,
        name: 'Roy Hill',
        longitude: 118.7,
        latitude: -22.3,
        countryCode: 'AU',
        region: 'Pilbara',
        commodity: 'iron_ore',
        status: 'decommissioned',
        technologySuppliers: ['Caterpillar', 'RCT'],
        machineCount: 20,
        deploymentCount: 1,
      }],
    })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/map')
  })

  it('serializes all supported filters, bbox order, snake_case names and special characters', async () => {
    await getMap({
      bbox: [110, -35, 130, -10],
      supplier: 'A&B + Mining',
      date: '2026-09-12',
      country: 'AU',
      region: 'Western Australia',
      machineType: 'haul_truck',
      automationLevel: 'full',
      commodity: 'iron_ore',
      environment: 'surface',
    })

    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')
    expect(url.pathname).toBe('/api/map')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      bbox: '110,-35,130,-10',
      supplier: 'A&B + Mining',
      date: '2026-09-12',
      country: 'AU',
      region: 'Western Australia',
      machine_type: 'haul_truck',
      automation_level: 'full',
      commodity: 'iron_ore',
      environment: 'surface',
    })
  })

  it('sends the year and the decommissioned flag only when they are set', async () => {
    fetchMock.mockImplementation(async () => Response.json(mapDto))
    await getMap({ year: 2026, includeDecommissioned: true })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/map?year=2026&include_decommissioned=true')

    await getMap({ year: 2026, includeDecommissioned: false })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/map?year=2026')
  })

  it('omits undefined query parameters', async () => {
    await getMap({ machineType: 'drill', supplier: undefined })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/map?machine_type=drill')
  })

  it('supports an empty feature collection', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...mapDto, features: [] }))
    expect(await getMap()).toEqual({ excludedCount: 3, markers: [] })
  })

  it('propagates API failures', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'invalid date parameter' }, { status: 400 }))
    await expect(getMap({ date: 'invalid' })).rejects.toMatchObject({
      name: 'ApiError', status: 400, message: 'invalid date parameter',
    })
  })
})
