import { describe, expect, it } from 'vitest'

import { runVerification } from '../pipeline.js'
import { buildAliasMap } from '../retrieve.js'
import { InMemoryReportStore } from '../store.js'
import type { Recommendation, SpamGateResult } from '../types.js'
import { HybridVerifier } from '../verifier/hybrid.js'
import { LlmVerifier } from '../verifier/llm.js'
import { NliScorer } from '../verifier/nli.js'
import type { VerifierInput, VerifierResult } from '../verifier/types.js'
import { loadAliasGroups } from './aliases.js'
import { loadSmokeSet, smokeFetchedSource, type SmokeItem } from './smoke.js'

/**
 * Design §9 step 5's test: stages 0–6 end-to-end over every smoke item,
 * stored pages, in-memory store, real NLI scorer, and the LLM explicitly
 * absent so the run is deterministic and exercises D6. Expected
 * recommendations are the hand-checked output of the accepted rules
 * (2026-10-03): the 403 item is rejected by the gate and everything else
 * reads request_more_evidence — under D6 the clean items' required
 * sub-facts are supported only through page context, so `verify` needs the
 * LLM's review (the lift is asserted separately below). Downloads the NLI
 * weights on first run:
 *
 *   LIVE_NLI=1 npm test -- src/verification/eval/smoke-pipeline.test.ts
 */

const EXPECTED: Record<string, { gate: SpamGateResult; recommendation: Recommendation; basis?: RegExp }> = {
  'wandarra-full-clean': { gate: 'passed', recommendation: 'request_more_evidence', basis: /D6/ },
  'jarnvik-sparse-honest': { gate: 'passed', recommendation: 'request_more_evidence' },
  'witvlakte-403': { gate: 'unresolvable_url', recommendation: 'reject', basis: /spam gate/ },
  'wandarra-quantity-growth': { gate: 'passed', recommendation: 'request_more_evidence', basis: /different value for: quantity/ },
  'gunung-instruction-injection': { gate: 'passed', recommendation: 'request_more_evidence' },
  'wandarra-alias-cat': { gate: 'passed', recommendation: 'request_more_evidence' },
  'kurogane-hitachi-ja-alias': { gate: 'passed', recommendation: 'request_more_evidence', basis: /different value for: machine/ },
  'cerro-contradiction-manufacturer': { gate: 'passed', recommendation: 'request_more_evidence', basis: /different value for: machine/ },
  'wandarra-number-words': { gate: 'passed', recommendation: 'request_more_evidence' },
  'snowshoe-cnrl-alias': { gate: 'passed', recommendation: 'request_more_evidence' },
  'witvlakte-underground-lhd': { gate: 'passed', recommendation: 'request_more_evidence', basis: /D6/ },
  'koodina-rct-teleremote': { gate: 'passed', recommendation: 'request_more_evidence' },
  'gunung-month-year': { gate: 'passed', recommendation: 'request_more_evidence' },
  'cerro-region-government': { gate: 'passed', recommendation: 'request_more_evidence' },
  'berrigan-jv-two-owners': { gate: 'passed', recommendation: 'request_more_evidence' },
  'marloo-contractor': { gate: 'passed', recommendation: 'request_more_evidence' },
  'snowshoe-model-unknown': { gate: 'passed', recommendation: 'request_more_evidence' },
  'gunung-product-unnamed': { gate: 'passed', recommendation: 'request_more_evidence' },
  'jarnvik-fleetwide-ambiguity': { gate: 'passed', recommendation: 'request_more_evidence' },
  'teralba-irrelevant-page': { gate: 'passed', recommendation: 'request_more_evidence', basis: /does not establish the site/ },
}

/** Approves every routed claim citing the first candidate — the deterministic stand-in for a reviewing LLM. */
class ApprovingLlm extends LlmVerifier {
  constructor() {
    super({ transport: { create: () => Promise.reject(new Error('unused')) } })
  }

  override verify(input: VerifierInput): Promise<VerifierResult> {
    const cited = input.candidates[0]
    if (cited === undefined) {
      throw new Error('routed claim with no candidates')
    }
    return Promise.resolve({
      verdict: 'supported',
      candidate_index: 0,
      start: 0,
      end: cited.text.length,
      score: null,
      note: 'approved by test double',
      path: 'llm',
    })
  }
}

describe.runIf(process.env.LIVE_NLI === '1')('pipeline end-to-end on the smoke set (D6: no LLM)', () => {
  const aliasMap = buildAliasMap(loadAliasGroups())
  const verifier = new HybridVerifier(new NliScorer(), new LlmVerifier({ apiKey: null }))

  const run = async (item: SmokeItem, hybrid = verifier) => {
    const store = new InMemoryReportStore()
    const result = await runVerification(
      { submission: item.submission, evidenceUrl: item.evidenceUrl, freeText: null },
      {
        verifier: hybrid,
        store,
        aliasMap,
        fetch: () => Promise.resolve(smokeFetchedSource(item)),
        now: () => new Date(0),
      },
    )
    return { ...result, store }
  }

  const items = loadSmokeSet()

  it('the expectation table covers exactly the smoke set', () => {
    expect(new Set(Object.keys(EXPECTED))).toEqual(new Set(items.map((item) => item.key)))
  })

  for (const item of items) {
    const expected = EXPECTED[item.key]
    if (expected === undefined) {
      continue
    }
    it(`${item.key} → ${expected.recommendation}`, { timeout: 600_000 }, async () => {
      const { report, store } = await run(item)
      expect(report.spamGateResult).toBe(expected.gate)
      expect(report.recommendation).toBe(expected.recommendation)
      if (expected.basis !== undefined) {
        expect(report.recommendationBasis).toMatch(expected.basis)
      }
      expect(store.saved).toHaveLength(1)

      // R1 acceptance: every supported/contradicted claim cites a non-empty
      // span of the stored text (bounds were already enforced by the store).
      for (const claim of report.claims) {
        if (claim.verdict !== 'insufficient') {
          expect(claim.quoteStart).not.toBeNull()
          expect(report.source?.extractedText?.slice(claim.quoteStart ?? 0, claim.quoteEnd ?? 0)).toMatch(/\S/)
        }
      }
    })
  }

  it('witvlakte-403 never reaches a model (§9 acceptance)', { timeout: 600_000 }, async () => {
    const item = items.find((candidate) => candidate.key === 'witvlakte-403')
    expect(item).toBeDefined()
    const { report } = await run(item as SmokeItem)
    expect(report.claims).toEqual([])
    expect(report.modelName).toBeNull()
  })

  it('the sparse-but-honest submission is not rejected and supports what it shows (§9 acceptance)', { timeout: 600_000 }, async () => {
    const item = items.find((candidate) => candidate.key === 'jarnvik-sparse-honest')
    expect(item).toBeDefined()
    const { report } = await run(item as SmokeItem)
    expect(report.recommendation).not.toBe('reject')
    expect(report.fieldVerdicts.site).toBe('supported')
    expect(report.fieldVerdicts.machine).toBeUndefined()
  })

  it('same inputs produce the same report (§9 acceptance)', { timeout: 600_000 }, async () => {
    const item = items.find((candidate) => candidate.key === 'wandarra-full-clean')
    expect(item).toBeDefined()
    const first = await run(item as SmokeItem)
    const second = await run(item as SmokeItem)
    expect(second.report).toEqual(first.report)
  })

  it('with an LLM reviewing the routed claims, the clean item reaches verify (D6 lift)', { timeout: 600_000 }, async () => {
    const item = items.find((candidate) => candidate.key === 'wandarra-full-clean')
    expect(item).toBeDefined()
    const lifted = new HybridVerifier(new NliScorer(), new ApprovingLlm())
    const { report } = await run(item as SmokeItem, lifted)
    expect(report.recommendation).toBe('verify')
    expect(report.recommendationBasis).toContain('qualifying')
    expect(report.promptVersion).toBe('verify-claim.v1')
  })
})
