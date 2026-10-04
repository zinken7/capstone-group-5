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
  })

  it('rejects an incomplete response instead of silently using stale values', async () => {
    fetchMock.mockResolvedValue(Response.json({ automation_levels: [] }))

    await expect(getContributionReferenceData()).rejects.toThrow('Invalid reference data: machine_types')
  })
})
