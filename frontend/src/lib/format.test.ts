import { describe, expect, test } from 'vitest'
import { formatCountry, formatDate, formatEnumLabel, formatNumber } from './format'

describe('shared formatting', () => {
  test('formats numbers and missing values consistently', () => {
    expect(formatNumber(1639)).toBe('1,639')
    expect(formatNumber(null)).toBe('Not recorded')
  })

  test('formats enums and country codes', () => {
    expect(formatEnumLabel('underground_haul_truck')).toBe('Underground haul truck')
    expect(formatEnumLabel('lhd')).toBe('LHD')
    expect(formatEnumLabel('semi_autonomous')).toBe('Semi-autonomous')
    expect(formatCountry('AU')).toBe('Australia')
  })

  test('keeps year-only dates and formats full dates', () => {
    expect(formatDate('2024')).toBe('2024')
    expect(formatDate('2024-03-09')).toBe('09/03/2024')
    expect(formatDate(null)).toBe('Not recorded')
  })
})
