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

  it('parses site_id as a positive whole number', () => {
    expect(parseDeploymentFilters({ site_id: ' 12 ' })).toEqual({ ok: true, value: { siteId: 12 } })
    expect(parseDeploymentFilters({ site_id: '' })).toEqual({ ok: true, value: {} })
  })

  it('rejects a site_id that is not a positive whole number', () => {
    for (const siteId of ['0', '-1', '1.5', 'abc', '01', '99999999999999999999', ['1', '2']]) {
      expect(parseDeploymentFilters({ site_id: siteId }), String(siteId)).toEqual({ ok: false, error: 'invalid site_id parameter' })
    }
  })

  it('rejects a repeated parameter', () => {
    expect(parseDeploymentFilters({ country: ['AU', 'CA'] })).toEqual({
      ok: false,
      error: 'invalid country parameter',
    })
  })
})
