import { describe, expect, it } from 'vitest'

import { NliScorer, NliVerifier, decideVerdict, type NliScores } from './nli.js'

/**
 * The deterministic half of build step 3's test: the threshold rule and the
 * no-candidate short-circuit, no model involved. The model-dependent half
 * (real scores, smoke-set thresholds) is nli.live.test.ts, gated like the
 * other network tests so `npm test` stays deterministic.
 */

const score = (entailment: number, contradiction: number): NliScores => ({
  entailment,
  contradiction,
  neutral: 1 - entailment - contradiction,
})

const thresholds = { supported: 0.7, contradicted: 0.8 }

describe('decideVerdict', () => {
  it('supports on the best entailment at or above the threshold, citing that candidate', () => {
    const decision = decideVerdict([score(0.2, 0.1), score(0.95, 0.01)], thresholds)
    expect(decision).toMatchObject({ verdict: 'supported', index: 1, score: 0.95, note: null })
  })

  it('contradicts when contradiction clears its threshold and nothing supports', () => {
    const decision = decideVerdict([score(0.1, 0.9), score(0.3, 0.2)], thresholds)
    expect(decision).toMatchObject({ verdict: 'contradicted', index: 0, score: 0.9 })
  })

  it('prefers supported over a threshold-clearing contradiction, noting the conflict for D3', () => {
    const decision = decideVerdict([score(0.05, 0.85), score(0.92, 0.02)], thresholds)
    expect(decision).toMatchObject({ verdict: 'supported', index: 1 })
    expect(decision.note).toContain('candidate 0 also contradicts')
  })

  it('is insufficient below both thresholds, keeping the best entailment as the score', () => {
    const decision = decideVerdict([score(0.5, 0.3)], thresholds)
    expect(decision.verdict).toBe('insufficient')
    expect(decision.index).toBeNull()
    expect(decision.score).toBe(0.5)
    expect(decision.note).toContain('below threshold')
  })
})

describe('NliVerifier', () => {
  it('returns insufficient without touching the model when there are no candidates', async () => {
    const verifier = new NliVerifier(new NliScorer({ modelId: 'intentionally/never-loaded' }))
    await expect(verifier.verify({ hypothesis: 'Anything.', candidates: [] })).resolves.toEqual({
      verdict: 'insufficient',
      candidate_index: null,
      start: null,
      end: null,
      score: null,
      note: 'no candidate sentences to score',
      path: 'nli',
    })
  })
})
