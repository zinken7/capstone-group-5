import { describe, expect, it } from 'vitest'

import { countryName, machineTypeLabel } from './live'

describe('countryName', () => {
  it.each([
    ['AU', 'Australia'],
    ['US', 'United States'],
    ['CL', 'Chile'],
    ['FI', 'Finland'],
    ['PE', 'Peru'],
    ['SE', 'Sweden'],
    ['ZA', 'South Africa'],
  ])('names %s as %s', (code, name) => {
    expect(countryName(code)).toBe(name)
  })

  it.each(['', 'not-a-code'])('returns %j unchanged when it is not a region code', (value) => {
    expect(countryName(value)).toBe(value)
  })
})

describe('machineTypeLabel', () => {
  it.each([
    ['haul_truck', 'Haul truck'],
    ['lhd', 'LHD'],
    ['underground_haul_truck', 'Underground haul truck'],
    ['water_truck', 'Water truck'],
    ['rock_breaker', 'Rock breaker'],
  ])('labels %s as %s', (machineType, label) => {
    expect(machineTypeLabel(machineType)).toBe(label)
  })

  // MapPage filters by turning the label back into the API value.
  it('keeps labels reversible to the API value', () => {
    for (const machineType of ['haul_truck', 'underground_haul_truck', 'strut_handler']) {
      expect(machineTypeLabel(machineType).toLowerCase().replaceAll(' ', '_')).toBe(machineType)
    }
  })
})
