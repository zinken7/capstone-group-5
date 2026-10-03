import { describe, expect, it } from 'vitest'

import type { Submission } from './decompose.js'
import { isLinksOnly, runVerification, type PipelineOptions } from './pipeline.js'
import type { FetchedSource } from './sources.js'
import { InMemoryReportStore, assertStorable, type VerificationReport } from './store.js'
import type { HybridOutcome } from './verifier/hybrid.js'
import type { VerifierInput } from './verifier/types.js'

/**
 * Stages 0–6 with a scripted verifier and fetch — the §9 acceptance tests
 * that need no database and no model: the gate stops bad submissions
 * before any model, cited spans are absolute into the stored text, and the
 * same inputs produce the same report.
 */

const SUBMISSION: Submission = {
  site: { name: 'Testville', countryCode: 'AU', region: null },
  companyRoles: [],
  machine: { manufacturer: 'Caterpillar', machineType: 'haul_truck', modelName: null },
  technology: null,
  quantity: null,
  commissioning: null,
}

const PAGE_TEXT = 'Testville is a mine in Australia.\nThe site runs Caterpillar haul trucks.'

function page(text: string | null): FetchedSource {
  return {
    url: 'https://example.com/a',
    archivedUrl: null,
    httpStatus: text === null ? 403 : 200,
    publishedDate: '2024-01-01',
    sourceClass: 'news',
    extractedText: text,
    textSha256: text === null ? null : 'test',
    fetchedAt: new Date(0),
    failure: text === null ? 'HTTP 403; no archive snapshot' : null,
  }
}

/** Supports everything, citing the full first candidate — a well-behaved stage 4. */
function supportiveVerifier(calls: VerifierInput[] = []): PipelineOptions['verifier'] {
  return {
    verifyWithRoute: (input: VerifierInput): Promise<HybridOutcome> => {
      calls.push(input)
      const candidate = input.candidates[0]
      if (candidate === undefined) {
        throw new Error('no candidates')
      }
      return Promise.resolve({
        result: {
          verdict: 'supported',
          candidate_index: 0,
          start: 0,
          end: candidate.text.length,
          score: 0.9,
          note: null,
          path: 'nli',
        },
        route: null,
        unreviewed: false,
        contextOnly: false,
      })
    },
  }
}

function options(overrides: Partial<PipelineOptions> = {}): PipelineOptions {
  return {
    verifier: supportiveVerifier(),
    store: new InMemoryReportStore(),
    fetch: () => Promise.resolve(page(PAGE_TEXT)),
    now: () => new Date(0),
    ...overrides,
  }
}

const job = { submission: SUBMISSION, evidenceUrl: 'https://example.com/a', freeText: null }

describe('spam gate (§6 stage 0; §9: an unresolvable submission never reaches a model)', () => {
  it.each([
    ['a missing URL', null],
    ['an unparseable URL', 'not a url'],
    ['a non-http URL', 'ftp://example.com/x'],
  ])('%s fails as no_url before any fetch', async (_name, evidenceUrl) => {
    const calls: VerifierInput[] = []
    let fetched = 0
    const opts = options({
      verifier: supportiveVerifier(calls),
      fetch: () => {
        fetched += 1
        return Promise.resolve(page(PAGE_TEXT))
      },
    })
    const { report } = await runVerification({ ...job, evidenceUrl }, opts)
    expect(report).toMatchObject({ spamGateResult: 'no_url', recommendation: 'reject', modelName: null })
    expect(report.claims).toEqual([])
    expect(fetched).toBe(0)
    expect(calls).toEqual([])
  })

  it('a URL with no extractable text fails as unresolvable_url and the verifier never runs', async () => {
    const calls: VerifierInput[] = []
    const opts = options({ verifier: supportiveVerifier(calls), fetch: () => Promise.resolve(page(null)) })
    const { report } = await runVerification(job, opts)
    expect(report.spamGateResult).toBe('unresolvable_url')
    expect(report.recommendationBasis).toContain('HTTP 403')
    expect(report.source?.httpStatus).toBe(403)
    expect(calls).toEqual([])
  })

  it('a junk domain fails after the fetch, with the reason recorded', async () => {
    const { report } = await runVerification(job, options({ junkDomains: ['example.com'] }))
    expect(report).toMatchObject({ spamGateResult: 'junk_domain', recommendation: 'reject' })
  })

  it('links-only free text fails; free text with words passes', async () => {
    const { report } = await runVerification({ ...job, freeText: 'https://a.example www.b.example' }, options())
    expect(report.spamGateResult).toBe('links_only')
    expect(isLinksOnly('see https://a.example for the fleet announcement')).toBe(false)
    expect(isLinksOnly(null)).toBe(false)
    expect(isLinksOnly('   ')).toBe(false)
  })
})

describe('stages 2–6 (§9: a span not in the stored source is never shown as evidence)', () => {
  it('stores absolute quote offsets that slice the stored text to the cited candidate', async () => {
    const store = new InMemoryReportStore()
    const { report, reportId } = await runVerification(job, options({ store }))

    expect(report.spamGateResult).toBe('passed')
    expect(reportId).toBe(1)
    expect(store.saved).toHaveLength(1)
    expect(report.claims.length).toBeGreaterThan(0)
    for (const claim of report.claims) {
      expect(claim.quoteStart).not.toBeNull()
      const quote = PAGE_TEXT.slice(claim.quoteStart ?? 0, claim.quoteEnd ?? 0)
      // The scripted verifier cites a whole candidate, so the absolute
      // offsets must reproduce a full sentence of the stored text.
      expect(['Testville is a mine in Australia.', 'The site runs Caterpillar haul trucks.']).toContain(quote)
    }
    expect(report.fieldVerdicts.site).toBe('supported')
    expect(report.fieldVerdicts.machine).toBe('supported')
  })

  it('a corrupt span is refused by the store before insert', () => {
    const report: VerificationReport = {
      spamGateResult: 'passed',
      recommendation: 'verify',
      recommendationBasis: 'test',
      fieldVerdicts: {},
      modelName: null,
      promptVersion: null,
      generatedAt: new Date(0),
      source: page(PAGE_TEXT),
      claims: [
        {
          field: 'site',
          subject: '',
          subFact: 'name',
          required: true,
          hypothesis: 'H.',
          verdict: 'supported',
          quoteStart: 0,
          quoteEnd: PAGE_TEXT.length + 50,
          score: null,
          path: 'nli',
          note: null,
        },
      ],
    }
    expect(() => assertStorable(report)).toThrow(/not inside the stored source text/)
    expect(() => new InMemoryReportStore().save(report)).toThrow(/not inside the stored source text/)
  })

  it('same inputs produce the same report (§9 acceptance)', async () => {
    const first = await runVerification(job, options())
    const second = await runVerification(job, options())
    expect(second.report).toEqual(first.report)
  })

  it('claims with no retrieved candidates skip stage 4: path null, nothing cited', async () => {
    const opts = options({ fetch: () => Promise.resolve(page('Nothing about anything relevant here.')) })
    const { report } = await runVerification(job, opts)
    for (const claim of report.claims) {
      expect(claim).toMatchObject({ verdict: 'insufficient', path: null, quoteStart: null })
    }
    expect(report.recommendation).toBe('request_more_evidence')
    expect(report.recommendationBasis).toContain('does not establish the site')
  })
})
