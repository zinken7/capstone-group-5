import { describe, expect, it } from 'vitest'

import { validateCorrection } from './correction-validation.js'

describe('validateCorrection', () => {
  it('collects only the fields that were given', () => {
    expect(validateCorrection({
      quantity: 30,
      deployment_status: 'decommissioned',
      commissioning_date: '2018',
      environment: null,
      change_note: 'Fleet reduced in 2024',
      disclosure_accepted: true,
    })).toEqual({
      ok: true,
      value: {
        changes: { quantity: 30, status: 'decommissioned', commissioning: { date: null, year: 2018 } },
        evidenceUrls: [],
        contributorEmail: null,
        organisation: null,
        changeNote: 'Fleet reduced in 2024',
      },
    })
  })

  it('accepts evidence on its own', () => {
    const result = validateCorrection({ evidence_urls: ['https://example.com/x'], disclosure_accepted: true })
    expect(result.ok && result.value).toMatchObject({ changes: {}, evidenceUrls: ['https://example.com/x'] })
  })

  it('rejects a correction that changes nothing', () => {
    expect(validateCorrection({ change_note: 'hello', disclosure_accepted: true })).toEqual({
      ok: false,
      errors: { body: 'must change at least one field or add evidence' },
    })
  })

  it('validates values and the disclosure confirmation', () => {
    expect(validateCorrection({ quantity: 0, installation_type: 'bolted_on' })).toEqual({
      ok: false,
      errors: {
        quantity: 'must be a whole number between 1 and 100000',
        installation_type: 'must be one of: factory_installed, retrofit, unknown',
        disclosure_accepted: 'must be true',
      },
    })
  })

  it('limits the change note length', () => {
    const result = validateCorrection({ quantity: 2, change_note: 'x'.repeat(1001), disclosure_accepted: true })
    expect(result.ok ? null : result.errors.change_note).toBe('must be at most 1000 characters')
  })
})
