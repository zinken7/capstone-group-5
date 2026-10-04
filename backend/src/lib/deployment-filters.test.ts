import { describe, expect, it } from 'vitest'

import { parseDeploymentFilters } from './deployment-filters.js'

describe('parseDeploymentFilters', () => {
  it('maps snake_case query parameters to filter fields', () => {
    expect(parseDeploymentFilters({
      q: 'roy',
      country: 'AU',
      machine_type: 'haul_truck',
      automation_level: 'autonomous',
      status: 'operational',
    })).toEqual({
      ok: true,
      value: { q: 'roy', country: 'AU', machineType: 'haul_truck', automationLevel: 'autonomous', status: 'operational' },
    })
  })

  it('trims values and drops blank ones', () => {
    expect(parseDeploymentFilters({ supplier: '  RCT ', region: '   ' })).toEqual({
      ok: true,
      value: { supplier: 'RCT' },
    })
  })

  it('ignores unknown parameters', () => {
    expect(parseDeploymentFilters({ sort: 'site', limit: '10' })).toEqual({ ok: true, value: {} })
  })

  it('rejects a repeated parameter', () => {
    expect(parseDeploymentFilters({ country: ['AU', 'CA'] })).toEqual({
      ok: false,
      error: 'invalid country parameter',
    })
  })
})
