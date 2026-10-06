import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAnalyticsBreakdowns, getAnalyticsCrosstab, getAnalyticsSummary, getAnalyticsTimeline } from './analytics'

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
    await getAnalyticsSummary({ siteId: '7', q: 'A&B', machineType: 'haul_truck', commissionedFrom: '2019', commissionedTo: '2024' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/analytics/summary?q=A%26B&site_id=7&machine_type=haul_truck&commissioned_from=2019&commissioned_to=2024')
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

  it('asks the crosstab endpoint for two dimensions with the shared filters', async () => {
    await getAnalyticsCrosstab('manufacturer', 'machine_type')
    await getAnalyticsCrosstab('commissioning_year', 'automation_level', { country: 'AU', supplier: 'A&B' })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/analytics/crosstab?rows=manufacturer&columns=machine_type')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/analytics/crosstab?rows=commissioning_year&columns=automation_level&country=AU&supplier=A%26B')
  })

  it('calls the timeline endpoint without filters', async () => {
    await getAnalyticsTimeline()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/analytics/timeline')
  })
})
