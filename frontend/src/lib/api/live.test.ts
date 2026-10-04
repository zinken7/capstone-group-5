import { describe, expect, it } from 'vitest'

import { countryName } from './live'

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
