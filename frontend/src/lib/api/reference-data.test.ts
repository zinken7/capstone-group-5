import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getContributionReferenceData } from './reference-data'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', '/api')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('getContributionReferenceData', () => {
  it('loads API options and preserves the backend labels', async () => {
    fetchMock.mockResolvedValue(Response.json({
      machine_types: ['haul_truck', 'loader'],
      automation_levels: [
        'operator_assistance',
        'autonomous',
      ],
      environments: ['surface', 'underground', 'both'],
      deployment_statuses: ['operational'],
      installation_types: ['factory_installed', 'retrofit', 'unknown'],
      technology_products: [{ supplier: 'Sandvik', product: 'AutoMine', automation_level: 'semi_autonomous' }],
    }))

    const result = await getContributionReferenceData()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/reference-data')
    expect(result.automationLevels).toEqual([
      ['operator_assistance', 'Operator assistance'],
      ['autonomous', 'Autonomous'],
    ])
    expect(result.machineTypes).toEqual([
      ['haul_truck', 'Haul truck'],
      ['loader', 'Loader'],
    ])
    expect(result.technologyProducts).toEqual([{ supplier: 'Sandvik', product: 'AutoMine', automationLevel: 'semi_autonomous' }])
  })

  it('uses country-specific labels when countries come from the API', async () => {
    fetchMock.mockResolvedValue(Response.json({
      machine_types: ['haul_truck'],
      automation_levels: ['autonomous'],
      environments: ['surface'],
      deployment_statuses: ['operational'],
      installation_types: ['unknown'],
      countries: ['AU', 'XR'],
    }))

    const result = await getContributionReferenceData()

    expect(result.countries).toEqual([
      ['AU', 'Australia'],
      ['XR', 'Anonymised'],
    ])
  })

  it('rejects an incomplete response instead of silently using stale values', async () => {
    fetchMock.mockResolvedValue(Response.json({ automation_levels: [] }))

    await expect(getContributionReferenceData()).rejects.toThrow('Invalid reference data: machine_types')
  })
})
