import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getAnalyticsBreakdowns, getAnalyticsSummary } from './analytics'

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

describe('analytics API', () => {
  test('serializes register filters for the summary endpoint', async () => {
    fetchMock.mockResolvedValue(Response.json({ machine_count: 12, site_count: 2, country_count: 1 }))

    await expect(getAnalyticsSummary({ siteId: '7', machineType: 'haul_truck', q: 'A&B' })).resolves.toEqual({
      machineCount: 12,
      siteCount: 2,
      countryCount: 1,
    })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/analytics/summary?q=A%26B&site_id=7&machine_type=haul_truck')
  })

  test('maps breakdown dimensions including status', async () => {
    fetchMock.mockResolvedValue(Response.json({
      machine_count: 12,
      by_country: [{ key: 'AU', machine_count: 12, share: 1 }],
      by_machine_type: [],
      by_manufacturer: [],
      by_supplier: [],
      by_automation_level: [],
      by_status: [{ key: 'operational', machine_count: 12, share: 1 }],
    }))

    await expect(getAnalyticsBreakdowns()).resolves.toMatchObject({
      machineCount: 12,
      byCountry: [{ key: 'AU', machineCount: 12, share: 1 }],
      byStatus: [{ key: 'operational', machineCount: 12, share: 1 }],
    })
  })
})
