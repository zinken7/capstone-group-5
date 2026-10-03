import { describe, expect, it } from 'vitest'

import { HybridVerifier, type PairScorer } from './hybrid.js'
import { LlmVerifier, type LlmTransport } from './llm.js'
import type { NliScores } from './nli.js'
import type { Candidate } from './types.js'

/**
 * The routing rules (S1/S2/residual band) and D6 degradation, with a
 * scripted scorer keyed by premise text — no model, no network. S3 is
 * aggregation's rule and is tested there.
 */

const candidates: Candidate[] = [
  { index: 0, text: 'bare0', start: 0, end: 5 },
  { index: 1, text: 'bare1', start: 6, end: 11 },
]

const neutral: NliScores = { entailment: 0.01, contradiction: 0.01, neutral: 0.98 }

function scorerFrom(table: Record<string, NliScores>): PairScorer {
  return {
    scoreMany: (premises) => Promise.resolve(premises.map((premise) => table[premise] ?? neutral)),
  }
}

const score = (entailment: number, contradiction: number): NliScores => ({
  entailment,
  contradiction,
  neutral: Math.max(0, 1 - entailment - contradiction),
})

const noLlm = new LlmVerifier({ apiKey: null })

const llmReplying = (reply: unknown): LlmVerifier =>
  new LlmVerifier({
    transport: { create: () => Promise.resolve({ content: [{ type: 'text', text: JSON.stringify(reply) }] } as never) },
  })

const input = { hypothesis: 'H.', candidates, context: 'CTX' }

describe('HybridVerifier routing', () => {
  it('a support that is strong bare and in context stays on the NLI path, scored bare', async () => {
    const scorer = scorerFrom({ 'CTX bare1': score(0.97, 0.01), bare1: score(0.95, 0.01) })
    const outcome = await new HybridVerifier(scorer, noLlm).verifyWithRoute(input)
    expect(outcome).toMatchObject({ route: null, unreviewed: false, contextOnly: false })
    expect(outcome.result).toMatchObject({ verdict: 'supported', candidate_index: 1, score: 0.95, path: 'nli' })
  })

  it('cites the candidate that stands bare, not the contextual winner', async () => {
    // Candidate 0 wins with context; candidate 1 is the only one that
    // supports the hypothesis on its own, so it carries the quote.
    const scorer = scorerFrom({ 'CTX bare0': score(0.98, 0.01), bare0: score(0.02, 0.01), bare1: score(0.6, 0.01) })
    const outcome = await new HybridVerifier(scorer, noLlm).verifyWithRoute(input)
    expect(outcome.route).toBeNull()
    expect(outcome.result).toMatchObject({ verdict: 'supported', candidate_index: 1, score: 0.6, path: 'nli' })
  })

  it('the residual band reads the cited candidate’s bare score, not the contextual one', async () => {
    const scorer = scorerFrom({ 'CTX bare1': score(0.98, 0.01), bare1: score(0.3, 0.01) })
    const llm = llmReplying({ verdict: 'supported', candidate_index: 1, start: 0, end: 5, note: 'confirmed' })
    const outcome = await new HybridVerifier(scorer, llm).verifyWithRoute(input)
    expect(outcome.route).toBe('band_low_support')
    expect(outcome.result.path).toBe('llm')
  })

  it('S1: support that only exists with context routes to the LLM, whose verdict is final', async () => {
    const scorer = scorerFrom({ 'CTX bare1': score(0.97, 0.01) }) // bare1 scores neutral
    const llm = llmReplying({ verdict: 'insufficient', candidate_index: null, start: null, end: null, note: 'fleet-wide, not site-level' })
    const outcome = await new HybridVerifier(scorer, llm).verifyWithRoute(input)
    expect(outcome).toMatchObject({ route: 's1_context_only_support', unreviewed: false, contextOnly: false })
    expect(outcome.result).toMatchObject({ verdict: 'insufficient', path: 'llm', note: 'fleet-wide, not site-level' })
  })

  it('S1 under D6: without an LLM the verdict stands, flagged context-only and unreviewed', async () => {
    const scorer = scorerFrom({ 'CTX bare1': score(0.97, 0.01) })
    const outcome = await new HybridVerifier(scorer, noLlm).verifyWithRoute(input)
    expect(outcome).toMatchObject({ route: 's1_context_only_support', unreviewed: true, contextOnly: true })
    expect(outcome.result).toMatchObject({ verdict: 'supported', path: 'nli' })
    expect(outcome.result.note).toContain('D6')
  })

  it('S2: every contradicted verdict routes; under D6 the contradiction stands', async () => {
    const scorer = scorerFrom({ 'CTX bare0': score(0.0, 0.995) })
    const outcome = await new HybridVerifier(scorer, noLlm).verifyWithRoute(input)
    expect(outcome).toMatchObject({ route: 's2_contradicted', unreviewed: true, contextOnly: false })
    expect(outcome.result).toMatchObject({ verdict: 'contradicted', candidate_index: 0, path: 'nli' })
  })

  it('S2 with the LLM available: the reviewed verdict replaces the NLI one', async () => {
    const scorer = scorerFrom({ 'CTX bare0': score(0.0, 0.995) })
    const llm = llmReplying({ verdict: 'supported', candidate_index: 1, start: 0, end: 5, note: 'same value, different wording' })
    const outcome = await new HybridVerifier(scorer, llm).verifyWithRoute(input)
    expect(outcome.result).toMatchObject({ verdict: 'supported', candidate_index: 1, path: 'llm' })
  })

  it('residual band: a weak support routes even when the bare candidate clears S1', async () => {
    const scorer = scorerFrom({ 'CTX bare1': score(0.3, 0.01), bare1: score(0.3, 0.01) })
    const llm = llmReplying({ verdict: 'supported', candidate_index: 1, start: 0, end: 5, note: 'confirmed' })
    const outcome = await new HybridVerifier(scorer, llm).verifyWithRoute(input)
    expect(outcome.route).toBe('band_low_support')
    expect(outcome.result.path).toBe('llm')
  })

  it('a failed LLM call degrades like unavailability: NLI verdict stands, unreviewed', async () => {
    const scorer = scorerFrom({ 'CTX bare1': score(0.97, 0.01) })
    const failing: LlmTransport = { create: () => Promise.reject(new Error('socket hang up')) }
    const outcome = await new HybridVerifier(scorer, new LlmVerifier({ transport: failing })).verifyWithRoute(input)
    expect(outcome).toMatchObject({ route: 's1_context_only_support', unreviewed: true, contextOnly: true })
    expect(outcome.result).toMatchObject({ verdict: 'supported', path: 'nli' })
  })

  it('an insufficient NLI verdict is not routed', async () => {
    const outcome = await new HybridVerifier(scorerFrom({}), noLlm).verifyWithRoute(input)
    expect(outcome).toMatchObject({ route: null, unreviewed: false, contextOnly: false })
    expect(outcome.result.verdict).toBe('insufficient')
  })

  it('without page context S1 cannot fire', async () => {
    const scorer = scorerFrom({ bare1: score(0.97, 0.01) })
    const outcome = await new HybridVerifier(scorer, noLlm).verifyWithRoute({ hypothesis: 'H.', candidates, context: null })
    expect(outcome.route).toBeNull()
    expect(outcome.result.verdict).toBe('supported')
  })

  it('no candidates → insufficient without touching either model', async () => {
    const outcome = await new HybridVerifier(scorerFrom({}), noLlm).verifyWithRoute({ hypothesis: 'H.', candidates: [] })
    expect(outcome.result).toMatchObject({ verdict: 'insufficient', candidate_index: null })
  })
})
