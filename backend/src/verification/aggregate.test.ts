import { describe, expect, it } from 'vitest'

import { QUALIFYING_SOURCE_CLASSES, aggregate, fieldVerdict, hasSiteAnchor, type ClaimOutcome } from './aggregate.js'
import type { ClaimField, EvidenceType } from './types.js'
import type { Verdict } from './verifier/types.js'

/** Stage 5's rules, row by row (design §6 stage 5; D3/D4 as amended; S3; D6). */

function claim(
  field: ClaimField,
  subFact: string,
  verdict: Verdict,
  overrides: Partial<Pick<ClaimOutcome, 'required' | 'subject' | 'contextOnly'>> = {},
): ClaimOutcome {
  return { field, subFact, verdict, subject: '', required: true, contextOnly: false, ...overrides }
}

const newsSource = { publishedDate: '2024-05-01', sourceClass: 'news' as EvidenceType }

/** site + technology + quantity supported — the §6 stage 5 verify shape. */
const verifiableClaims = (): ClaimOutcome[] => [
  claim('site', 'name', 'supported'),
  claim('site', 'country', 'supported'),
  claim('technology', 'supplier_named', 'supported'),
  claim('quantity', 'count', 'supported'),
]

describe('fieldVerdict (§6 stage 5 table)', () => {
  it('all required and optional supported → supported', () => {
    expect(
      fieldVerdict([claim('site', 'name', 'supported'), claim('site', 'region', 'supported', { required: false })], false),
    ).toBe('supported')
  })

  it('all required supported, an optional not → partially supported', () => {
    expect(
      fieldVerdict([claim('site', 'name', 'supported'), claim('site', 'region', 'insufficient', { required: false })], false),
    ).toBe('partially_supported')
  })

  it('some required supported → partially supported', () => {
    expect(fieldVerdict([claim('site', 'name', 'supported'), claim('site', 'country', 'insufficient')], false)).toBe(
      'partially_supported',
    )
  })

  it('no sub-fact supported → insufficient', () => {
    expect(fieldVerdict([claim('site', 'name', 'insufficient'), claim('site', 'country', 'insufficient')], false)).toBe(
      'insufficient',
    )
  })

  it('any contradicted sub-fact → contradicted, unless the older-figure exemption holds', () => {
    const claims = [claim('quantity', 'count', 'contradicted'), claim('quantity', 'machine_type_matches', 'supported', { required: false })]
    expect(fieldVerdict(claims, false)).toBe('contradicted')
    expect(fieldVerdict(claims, true)).toBe('partially_supported')
  })

  it('an exempted contradiction caps an otherwise fully supported field at partially supported', () => {
    expect(
      fieldVerdict([claim('quantity', 'count', 'supported'), claim('quantity', 'machine_type_matches', 'contradicted', { required: false })], true),
    ).toBe('partially_supported')
  })
})

describe('D3: dated contradictions', () => {
  const contradicted = (): ClaimOutcome[] => [...verifiableClaims().slice(0, 3), claim('quantity', 'count', 'contradicted')]

  it('a source published before commissioning is an older figure, not a contradiction', () => {
    const result = aggregate({
      claims: contradicted(),
      source: { publishedDate: '2018-06-01', sourceClass: 'news' },
      commissioning: { year: 2019, month: null },
    })
    expect(result.fieldVerdicts.quantity).toBe('partially_supported')
    expect(result.recommendation).toBe('verify')
    expect(result.recommendationBasis).toContain('older source figure')
  })

  it('a source published on or after commissioning contradicts', () => {
    const result = aggregate({
      claims: contradicted(),
      source: { publishedDate: '2019-06-01', sourceClass: 'news' },
      commissioning: { year: 2019, month: null },
    })
    expect(result.fieldVerdicts.quantity).toBe('contradicted')
    expect(result.recommendation).toBe('request_more_evidence')
    expect(result.recommendationBasis).toContain('quantity')
  })

  it('the commissioning month sharpens the comparison', () => {
    const result = aggregate({
      claims: contradicted(),
      source: { publishedDate: '2019-03-01', sourceClass: 'news' },
      commissioning: { year: 2019, month: 6 },
    })
    expect(result.fieldVerdicts.quantity).toBe('partially_supported')
  })

  it('without a source date or a commissioning date, the exemption cannot apply', () => {
    for (const [publishedDate, commissioning] of [
      [null, { year: 2019, month: null }],
      ['2018-06-01', null],
    ] as const) {
      const result = aggregate({ claims: contradicted(), source: { publishedDate, sourceClass: 'news' }, commissioning })
      expect(result.fieldVerdicts.quantity).toBe('contradicted')
    }
  })
})

describe('S3: site anchor', () => {
  it('a source supporting neither site.name nor site.country caps every other verdict at insufficient', () => {
    const result = aggregate({
      claims: [
        claim('site', 'name', 'insufficient'),
        claim('site', 'country', 'insufficient'),
        claim('machine', 'manufacturer', 'supported'),
        claim('technology', 'supplier_named', 'contradicted'),
      ],
      source: newsSource,
      commissioning: null,
    })
    expect(result.capped).toEqual([false, false, true, true])
    expect(result.fieldVerdicts.machine).toBe('insufficient')
    expect(result.fieldVerdicts.technology).toBe('insufficient')
    expect(result.recommendation).toBe('request_more_evidence')
    expect(result.recommendationBasis).toContain('does not establish the site')
  })

  it('site.country alone anchors the source', () => {
    expect(hasSiteAnchor([claim('site', 'name', 'insufficient'), claim('site', 'country', 'supported')])).toBe(true)
  })
})

describe('recommendation (§6 stage 5 table, D4, D6)', () => {
  it('site and technology supported, quantity supported, qualifying source → verify', () => {
    const result = aggregate({ claims: verifiableClaims(), source: newsSource, commissioning: null })
    expect(result.recommendation).toBe('verify')
    expect(result.fieldVerdicts).toEqual({ site: 'supported', technology: 'supported', quantity: 'supported' })
  })

  it('D4: a non-qualifying source class blocks verify', () => {
    for (const sourceClass of ['other', 'report'] as const) {
      const result = aggregate({ claims: verifiableClaims(), source: { publishedDate: null, sourceClass }, commissioning: null })
      expect(result.recommendation).toBe('request_more_evidence')
      expect(result.recommendationBasis).toContain('D4')
    }
    expect(QUALIFYING_SOURCE_CLASSES).toEqual(['company_release', 'government', 'academic', 'news'])
  })

  it('D6: a required sub-fact supported only through unreviewed context blocks verify', () => {
    const claims = verifiableClaims()
    claims[3] = claim('quantity', 'count', 'supported', { contextOnly: true })
    const result = aggregate({ claims, source: newsSource, commissioning: null })
    expect(result.recommendation).toBe('request_more_evidence')
    expect(result.recommendationBasis).toContain('D6')
    expect(result.recommendationBasis).toContain('quantity.count')
  })

  it('D6 is narrowed to non-site fields: a context-only site sub-fact does not block verify', () => {
    const claims = verifiableClaims()
    claims[1] = claim('site', 'country', 'supported', { contextOnly: true })
    expect(aggregate({ claims, source: newsSource, commissioning: null }).recommendation).toBe('verify')
  })

  it('D6 does not block on optional context-only sub-facts', () => {
    const claims = [...verifiableClaims(), claim('quantity', 'machine_type_matches', 'supported', { required: false, contextOnly: true })]
    expect(aggregate({ claims, source: newsSource, commissioning: null }).recommendation).toBe('verify')
  })

  it('site supported with nothing else established → request more evidence', () => {
    const result = aggregate({
      claims: [claim('site', 'name', 'supported'), claim('site', 'country', 'supported'), claim('technology', 'supplier_named', 'insufficient')],
      source: newsSource,
      commissioning: null,
    })
    expect(result.recommendation).toBe('request_more_evidence')
    expect(result.recommendationBasis).toContain('remaining fields')
  })
})
