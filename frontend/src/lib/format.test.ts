import { describe, expect, test } from 'vitest'
import { formatCountry, formatDate, formatDay, formatEnumLabel, formatNumber } from './format'

describe('shared formatting', () => {
  test('formats numbers and missing values consistently', () => {
    expect(formatNumber(1639)).toBe('1,639')
    expect(formatNumber(null)).toBe('Not recorded')
  })

  test('formats enums and country codes', () => {
    expect(formatEnumLabel('underground_haul_truck')).toBe('Underground haul truck')
    expect(formatEnumLabel('lhd')).toBe('LHD')
    expect(formatEnumLabel('operator_assistance')).toBe('Operator Assistance')
    expect(formatEnumLabel('semi_autonomous')).toBe('Semi Autonomous')
    expect(formatEnumLabel('autonomous')).toBe('Highly Autonomous')
    expect(formatEnumLabel('both')).toBe('Surface and underground')
    expect(formatEnumLabel('surface_and_underground')).toBe('Surface and underground')
    expect(formatCountry('AU')).toBe('Australia')
  })

  test('keeps year-only dates and formats full dates', () => {
    expect(formatDate('2024')).toBe('2024')
    expect(formatDate('2024-03-09')).toBe('09/03/2024')
    expect(formatDate(null)).toBe('Not recorded')
  })

  test('shows a calendar date as the same day in every time zone, and an instant as the reader\'s day', () => {
    const zone = process.env.TZ
    try {
      // West of UTC, a date read as UTC midnight used to show the day before
      process.env.TZ = 'America/New_York'
      expect(formatDate('2025-06-30')).toBe('30/06/2025')
      // Submitted at 07:30 in Melbourne, which is still the day before in UTC
      process.env.TZ = 'Australia/Melbourne'
      expect(formatDay('2026-10-14T21:30:00.000Z')).toBe('15/10/2026')
      expect(formatDay(null)).toBe('Not recorded')
    } finally {
      // process.env turns undefined into the string "undefined", so an unset zone is deleted
      if (zone === undefined) delete process.env.TZ
      else process.env.TZ = zone
    }
  })
})
