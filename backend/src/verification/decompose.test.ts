import { describe, expect, it } from 'vitest'

import { decompose, type Submission } from './decompose.js'

const FULL: Submission = {
  site: { name: 'Wandarra Iron', countryCode: 'AU', region: 'Pilbara' },
  companyRoles: [
    { company: 'Rio Tinto', role: 'owner' },
    { company: 'Rio Tinto', role: 'operator' },
  ],
  machine: { manufacturer: 'Caterpillar', machineType: 'haul_truck', modelName: '793F' },
  technology: { supplier: 'Caterpillar', productName: 'Cat Command for Hauling' },
  quantity: 36,
  commissioning: { year: 2019, month: 6 },
}

function keyOf(claim: { field: string; subject: string; subFact: string }): string {
  return `${claim.field}/${claim.subject}/${claim.subFact}`
}

describe('decompose, full submission', () => {
  const claims = decompose(FULL)

  it('produces one claim per sub-fact instance', () => {
    // site 3, company_role 2 roles x 2 sub-facts, machine 3, technology 2,
    // quantity 2, commissioning 2.
    expect(claims).toHaveLength(16)
    expect(new Set(claims.map(keyOf)).size).toBe(16)
  })

  it('renders the §6.1 hypothesis templates', () => {
    const byKey = new Map(claims.map((claim) => [keyOf(claim), claim]))
    expect(byKey.get('site//name')?.hypothesis).toBe('There is a mine site named Wandarra Iron.')
    expect(byKey.get('site//country')?.hypothesis).toBe('The Wandarra Iron mine site is in Australia.')
    expect(byKey.get('site//region')?.hypothesis).toBe('The Wandarra Iron mine site is in the Pilbara region.')
    expect(byKey.get('company_role/rio tinto:owner/role_stated')?.hypothesis).toBe(
      'Rio Tinto is the owner of the Wandarra Iron mine site.',
    )
    expect(byKey.get('machine//machine_type')?.hypothesis).toBe('The Wandarra Iron mine site operates haul trucks.')
    expect(byKey.get('technology//supplier_named')?.hypothesis).toBe(
      'The Wandarra Iron mine site uses automation technology supplied by Caterpillar.',
    )
    expect(byKey.get('quantity//count')?.hypothesis).toBe('The Wandarra Iron mine site has 36 machines.')
    expect(byKey.get('quantity//machine_type_matches')?.hypothesis).toBe('The Wandarra Iron mine site has 36 haul trucks.')
    expect(byKey.get('commissioning//month')?.hypothesis).toBe('The deployment at Wandarra Iron began in June 2019.')
  })

  it('subjects distinguish company_role instances and are empty elsewhere', () => {
    const roleSubjects = claims.filter((claim) => claim.field === 'company_role').map((claim) => claim.subject)
    expect(new Set(roleSubjects)).toEqual(new Set(['rio tinto:owner', 'rio tinto:operator']))
    for (const claim of claims.filter((other) => other.field !== 'company_role')) {
      expect(claim.subject).toBe('')
    }
  })

  it('flags required and optional sub-facts per §6.1', () => {
    const required = new Set(claims.filter((claim) => claim.required).map((claim) => claim.subFact))
    const optional = new Set(claims.filter((claim) => !claim.required).map((claim) => claim.subFact))
    expect(required).toEqual(
      new Set(['name', 'country', 'company_named', 'role_stated', 'manufacturer', 'machine_type', 'supplier_named', 'count', 'year']),
    )
    expect(optional).toEqual(new Set(['region', 'model_name', 'product_name', 'machine_type_matches', 'month']))
  })

  it('count terms carry the number and the machine type vocabulary', () => {
    const count = claims.find((claim) => claim.subFact === 'count')
    expect(count?.terms).toContain('36')
    expect(count?.terms).toContain('trucks')
  })
})

describe('decompose, null fields produce no sub-facts', () => {
  it('a site-only submission yields only site claims', () => {
    const claims = decompose({
      site: { name: 'Cerro Escarcha', countryCode: 'CL', region: null },
      companyRoles: [],
      machine: null,
      technology: null,
      quantity: null,
      commissioning: null,
    })
    expect(claims.map(keyOf)).toEqual(['site//name', 'site//country'])
  })

  it('a machine without a model yields no model_name claim', () => {
    const claims = decompose({
      ...FULL,
      machine: { manufacturer: 'Caterpillar', machineType: 'haul_truck', modelName: null },
    })
    expect(claims.some((claim) => claim.subFact === 'model_name')).toBe(false)
    expect(claims.some((claim) => claim.subFact === 'machine_type')).toBe(true)
  })

  it('a machine type without a manufacturer still yields a readable hypothesis', () => {
    const claims = decompose({
      ...FULL,
      machine: { manufacturer: null, machineType: 'lhd', modelName: null },
    })
    expect(claims.find((claim) => claim.subFact === 'machine_type')?.hypothesis).toBe(
      'The Wandarra Iron mine site operates LHDs.',
    )
    expect(claims.some((claim) => claim.subFact === 'manufacturer')).toBe(false)
  })

  it('a missing month yields a year claim only', () => {
    const claims = decompose({ ...FULL, commissioning: { year: 2021, month: null } })
    expect(claims.some((claim) => claim.subFact === 'year')).toBe(true)
    expect(claims.some((claim) => claim.subFact === 'month')).toBe(false)
  })
})
