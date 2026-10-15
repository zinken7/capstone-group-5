import { describe, expect, test } from 'vitest'
import { validateContribution } from './validation'
import { EMPTY_CONTRIBUTION_FORM } from './types'

const validValues = {
  ...EMPTY_CONTRIBUTION_FORM,
  siteName: 'Roy Hill',
  countryCode: 'AU',
  latitude: '',
  longitude: '',
  machineType: 'haul_truck',
  manufacturer: 'Caterpillar',
  machineModel: '793F',
  technologySupplier: 'ASI Mining',
  automationLevel: 'autonomous',
  quantity: '10',
  commissioningDate: '2025',
  email: '',
  evidenceUrls: [],
  disclosureAccepted: true,
}

describe('Contribute validation boundaries', () => {
  test.each(['1', '100000'])(
    'AT-04 accepts valid quantity %s',
    (quantity) => {
      const errors = validateContribution({ ...validValues, quantity })
      expect(errors.quantity).toBeUndefined()
    },
  )

  test.each(['0', '-5', '2.5', '100001', ''])(
    'AT-04 rejects invalid quantity %s',
    (quantity) => {
      const errors = validateContribution({ ...validValues, quantity })
      expect(errors.quantity).toBeDefined()
    },
  )

  test.each(['1900', '2100', '2024-02-29'])(
    'AT-05 accepts valid commissioning %s',
    (commissioningDate) => {
      const errors = validateContribution({
        ...validValues,
        commissioningDate,
      })
      expect(errors.commissioningDate).toBeUndefined()
    },
  )

  test.each(['1800', '2101', '2024-02-30', '2101-01-01'])(
    'AT-05 rejects invalid commissioning %s',
    (commissioningDate) => {
      const errors = validateContribution({
        ...validValues,
        commissioningDate,
      })
      expect(errors.commissioningDate).toBeDefined()
    },
  )
})

describe('AT-16 evidence URL boundaries', () => {
  test('accepts 10 valid evidence URLs', () => {
    const evidenceUrls = Array.from(
      { length: 10 },
      (_, index) => `https://example.com/evidence/${index}`,
    )

    const errors = validateContribution({ ...validValues, evidenceUrls })
    expect(errors.evidenceUrls).toBeUndefined()
  })

  test('rejects more than 10 evidence URLs', () => {
    const evidenceUrls = Array.from(
      { length: 11 },
      (_, index) => `https://example.com/evidence/${index}`,
    )

    const errors = validateContribution({ ...validValues, evidenceUrls })
    expect(errors.evidenceUrls).toMatch(/no more than 10/i)
  })

  test('accepts an evidence URL of exactly 2000 characters', () => {
    const prefix = 'https://example.com/'
    const url = prefix + 'a'.repeat(2000 - prefix.length)

    const errors = validateContribution({
      ...validValues,
      evidenceUrls: [url],
    })

    expect(errors.evidenceUrls).toBeUndefined()
  })

  test('rejects an evidence URL longer than 2000 characters', () => {
    const prefix = 'https://example.com/'
    const url = prefix + 'a'.repeat(2001 - prefix.length)

    const errors = validateContribution({
      ...validValues,
      evidenceUrls: [url],
    })

    expect(errors.evidenceUrls).toMatch(/at most 2000 characters/i)
  })
})
describe('AT-17 text field length boundaries', () => {
  const fields = [
    { field: 'siteName', max: 200 },
    { field: 'region', max: 100 },
    { field: 'commodity', max: 100 },
    { field: 'manufacturer', max: 200 },
    { field: 'machineModel', max: 200 },
    { field: 'machineModelVariant', max: 100 },
    { field: 'technologySupplier', max: 200 },
    { field: 'technologyProduct', max: 200 },
    { field: 'organisation', max: 200 },
  ] as const

  test.each(fields)(
    'accepts $field at exactly $max characters',
    ({ field, max }) => {
      const errors = validateContribution({
        ...validValues,
        [field]: 'a'.repeat(max),
      })

      expect(errors[field]).toBeUndefined()
    },
  )

  test.each(fields)(
    'rejects $field exceeding $max characters',
    ({ field, max }) => {
      const errors = validateContribution({
        ...validValues,
        [field]: 'a'.repeat(max + 1),
      })

      expect(errors[field]).toMatch(new RegExp(`at most ${max} characters`))
    },
  )
})
describe('AT-18 email length boundaries', () => {
  test('accepts an empty email', () => {
    const errors = validateContribution({
      ...validValues,
      email: '',
    })

    expect(errors.email).toBeUndefined()
  })

  test('accepts a normal valid email', () => {
    const errors = validateContribution({
      ...validValues,
      email: 'test@example.com',
    })

    expect(errors.email).toBeUndefined()
  })

  test('accepts an email of exactly 254 characters', () => {
    const email = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' +
      'c'.repeat(63) + '.' + 'd'.repeat(61)

    expect(email).toHaveLength(254)

    const errors = validateContribution({
      ...validValues,
      email,
    })

    expect(errors.email).toBeUndefined()
  })

  test('rejects an email longer than 254 characters', () => {
    const email = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' +
      'c'.repeat(63) + '.' + 'd'.repeat(62)

    expect(email).toHaveLength(255)

    const errors = validateContribution({
      ...validValues,
      email,
    })

    expect(errors.email).toMatch(/at most 254 characters/i)
  })

  test('rejects an invalid email format', () => {
    const errors = validateContribution({
      ...validValues,
      email: 'invalid-email',
    })

    expect(errors.email).toMatch(/valid email address/i)
  })
})

describe('AT-19 latitude and longitude validation', () => {
  test('rejects both invalid coordinates independently', () => {
    const errors = validateContribution({
      ...validValues,
      latitude: '-91',
      longitude: '181',
    })

    expect(errors.latitude).toBe('Latitude must be between -90 and 90.')
    expect(errors.longitude).toBe('Longitude must be between -180 and 180.')
  })

  test('rejects invalid latitude only', () => {
    const errors = validateContribution({
      ...validValues,
      latitude: '91',
      longitude: '100',
    })

    expect(errors.latitude).toBe('Latitude must be between -90 and 90.')
    expect(errors.longitude).toBeUndefined()
  })

  test('rejects invalid longitude only', () => {
    const errors = validateContribution({
      ...validValues,
      latitude: '45',
      longitude: '181',
    })

    expect(errors.latitude).toBeUndefined()
    expect(errors.longitude).toBe('Longitude must be between -180 and 180.')
  })

  test('accepts valid coordinates', () => {
    const errors = validateContribution({
      ...validValues,
      latitude: '-31.95',
      longitude: '115.86',
    })

    expect(errors.latitude).toBeUndefined()
    expect(errors.longitude).toBeUndefined()
  })

  test('accepts both coordinates empty', () => {
    const errors = validateContribution({
      ...validValues,
      latitude: '',
      longitude: '',
    })

    expect(errors.latitude).toBeUndefined()
    expect(errors.longitude).toBeUndefined()
  })

  test('requires both coordinates when only one is provided', () => {
    const errors = validateContribution({
      ...validValues,
      latitude: '-31.95',
      longitude: '',
    })

    expect(errors.latitude).toBe(
      'Enter both latitude and longitude, or leave both blank.'
    )
    expect(errors.longitude).toBe(
      'Enter both latitude and longitude, or leave both blank.'
    )
  })
})
