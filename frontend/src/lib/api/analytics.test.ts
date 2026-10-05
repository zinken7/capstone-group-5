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
    await getAnalyticsSummary({
      country: 'AU',
      region: 'Western Australia',
      commodity: 'iron_ore',
      machineType: 'haul_truck',
      supplier: 'A&B Mining',
      manufacturer: 'Maker + Co',
      automationLevel: 'autonomous',
      environment: 'surface',
      status: 'operational',
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.pathname).toBe('/api/analytics/summary')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      country: 'AU',
      region: 'Western Australia',
      commodity: 'iron_ore',
      machine_type: 'haul_truck',
      supplier: 'A&B Mining',
      manufacturer: 'Maker + Co',
      automation_level: 'autonomous',
      environment: 'surface',
      status: 'operational',
    })
  })

  it('calls the breakdown and timeline endpoints without filters', async () => {
    await getAnalyticsBreakdowns()
    await getAnalyticsTimeline()

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/analytics/breakdowns',
      '/api/analytics/timeline',
    ])
  })
})
