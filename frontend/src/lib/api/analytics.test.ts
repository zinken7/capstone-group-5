import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAnalyticsBreakdowns, getAnalyticsSummary, getAnalyticsTimeline } from './analytics'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({})))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', '/api')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('analytics API client', () => {
  it('serializes shared filters with the backend parameter names', async () => {
    await getAnalyticsSummary({ siteId: '7', q: 'A&B', machineType: 'haul_truck' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/analytics/summary?q=A%26B&site_id=7&machine_type=haul_truck')
  })

  it('maps breakdown and status data for the register totals', async () => {
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
      machine_count: 12,
      by_status: [{ key: 'operational', machine_count: 12, share: 1 }],
    })
  })

  it('calls the timeline endpoint without filters', async () => {
    await getAnalyticsTimeline()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/analytics/timeline')
  })
})
