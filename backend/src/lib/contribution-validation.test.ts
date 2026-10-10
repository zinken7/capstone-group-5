import { describe, expect, it } from 'vitest'

import { validateContribution } from './contribution-validation.js'

const minimal = {
  site_name: 'Roy Hill',
  country_code: 'au',
  machine_type: 'haul_truck',
  machine_manufacturer: 'Caterpillar',
  machine_model: '793F',
  quantity: 12,
  technology_supplier: 'Caterpillar',
  automation_level: 'autonomous',
  disclosure_accepted: true,
}

describe('validateContribution', () => {
  it('accepts the minimum field set and fills defaults', () => {
    expect(validateContribution(minimal)).toEqual({
      ok: true,
      value: {
        siteName: 'Roy Hill',
        countryCode: 'AU',
        coordinates: null,
        region: null,
        commodity: null,
        machineType: 'haul_truck',
        machineManufacturer: 'Caterpillar',
        machineModel: '793F',
        machineModelVariant: null,
        quantity: 12,
        environment: null,
        deploymentStatus: null,
        automationLevel: 'autonomous',
        installationType: 'unknown',
        technologySupplier: 'Caterpillar',
        technologyProduct: null,
        commissioning: null,
        evidenceUrls: [],
        contributorEmail: null,
        organisation: null,
      },
    })
  })

  it('treats null and blank strings as absent', () => {
    const result = validateContribution({ ...minimal, region: '  ', technology_product: null, contributor_email: '' })
    expect(result.ok && result.value.region).toBeNull()
    expect(result.ok && result.value.technologyProduct).toBeNull()
    expect(result.ok && result.value.contributorEmail).toBeNull()
  })

  it.each([undefined, null, '', ' ', '\t\n'])('normalises absent or blank variant %j to null', (variant) => {
    const result = validateContribution({ ...minimal, machine_model_variant: variant })
    expect(result.ok && result.value.machineModelVariant).toBeNull()
  })

  it.each(['base', 'I'])('trims explicit variant %s without changing its spelling', (variant) => {
    const result = validateContribution({ ...minimal, machine_model_variant: ` \t${variant}\n ` })
    expect(result.ok && result.value.machineModelVariant).toBe(variant)
  })

  it('keeps year-only commissioning without inventing a date', () => {
    const yearOnly = validateContribution({ ...minimal, commissioning_date: '2019' })
    expect(yearOnly.ok && yearOnly.value.commissioning).toEqual({ date: null, year: 2019 })

    const fullDate = validateContribution({ ...minimal, commissioning_date: '2021-03-15' })
    expect(fullDate.ok && fullDate.value.commissioning).toEqual({ date: '2021-03-15', year: 2021 })
  })

  it('trims, de-duplicates and drops blank evidence URLs', () => {
    const result = validateContribution({
      ...minimal,
      evidence_urls: [' https://example.com/a ', '', 'https://example.com/a', 'http://example.com/b'],
    })
    expect(result.ok && result.value.evidenceUrls).toEqual(['https://example.com/a', 'http://example.com/b'])
  })

  it('reports every invalid field at once', () => {
    expect(validateContribution({
      country_code: 'Australia',
      machine_type: 'spaceship',
      quantity: 0,
      environment: 'moon',
      automation_level: 'line_of_sight_remote',
      commissioning_date: '2021-02-30',
      evidence_urls: ['ftp://example.com/file'],
      contributor_email: 'not-an-email',
      disclosure_accepted: false,
    })).toEqual({
      ok: false,
      errors: {
        site_name: 'is required',
        country_code: 'must be at most 2 characters',
        machine_type: expect.stringContaining('must be one of'),
        machine_manufacturer: 'is required',
        machine_model: 'is required',
        quantity: 'must be a whole number between 1 and 100000',
        technology_supplier: 'is required',
        environment: 'must be one of: surface, underground, both',
        automation_level: 'must be one of: operator_assistance, teleremote, semi_autonomous, autonomous',
        commissioning_date: 'must be a year (YYYY) or a date (YYYY-MM-DD)',
        evidence_urls: 'must contain only http or https URLs',
        contributor_email: 'must be a valid email address',
        disclosure_accepted: 'must be true',
      },
    })
  })

  it('rejects quantity sent as a string or a fraction', () => {
    for (const quantity of ['12', 1.5, -3]) {
      const result = validateContribution({ ...minimal, quantity })
      expect(result.ok ? null : result.errors.quantity).toBe('must be a whole number between 1 and 100000')
    }
  })

  it('requires the machine model, technology supplier and automation level (FR-07)', () => {
    const result = validateContribution({ ...minimal, machine_model: ' ', technology_supplier: null, automation_level: undefined })
    expect(result.ok ? null : result.errors).toEqual({
      machine_model: 'is required',
      technology_supplier: 'is required',
      automation_level: 'is required',
    })
  })

  it('accepts a supplier without a technology product', () => {
    const result = validateContribution({ ...minimal, technology_product: undefined })
    expect(result.ok && [result.value.technologySupplier, result.value.technologyProduct]).toEqual(['Caterpillar', null])
  })

  it('limits the number of evidence URLs', () => {
    const urls = Array.from({ length: 11 }, (_, index) => `https://example.com/${index}`)
    const result = validateContribution({ ...minimal, evidence_urls: urls })
    expect(result.ok ? null : result.errors.evidence_urls).toBe('must contain at most 10 URLs')
  })

  it('rejects a body that is not an object', () => {
    expect(validateContribution([])).toEqual({ ok: false, errors: { body: 'must be a JSON object' } })
    expect(validateContribution(null)).toEqual({ ok: false, errors: { body: 'must be a JSON object' } })
  })
})
