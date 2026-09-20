import { describe, expect, test } from 'vitest'
import { formatAustralianDateInput, parseAustralianDate } from './date'

describe('Australian date input', () => {
  test('formats numeric input as DD/MM/YYYY', () => {
    expect(formatAustralianDateInput('18092026')).toBe('18/09/2026')
    expect(formatAustralianDateInput('18/09/2026')).toBe('18/09/2026')
  })

  test('converts valid Australian dates to API format', () => {
    expect(parseAustralianDate('18/09/2026')).toBe('2026-09-18')
  })

  test('rejects impossible or incomplete dates', () => {
    expect(parseAustralianDate('31/02/2026')).toBeUndefined()
    expect(parseAustralianDate('18/09/26')).toBeUndefined()
  })
})
