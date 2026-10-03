import { LLM_FAILURE_NOTE_PREFIX, LLM_UNAVAILABLE_NOTE, type LlmVerifier } from './llm.js'
import {
  SMOKE_SET_THRESHOLDS,
  buildPremise,
  decideVerdict,
  nliResult,
  type NliScorer,
  type NliThresholds,
} from './nli.js'
import type { Verifier, VerifierInput, VerifierResult } from './types.js'

/**
 * Stage 4, the hybrid (design §4.2 as amended 2026-10-03): NLI first, LLM
 * on structurally risky claims. Confidence alone routes nothing — every
 * measured NLI error was confident — so routing is by risk signal:
 *
 * - S1: no candidate clears the supported threshold on its own — the
 *   support exists only with the page-lead context, so the verdict rests
 *   on a coreference bridge only the LLM can judge. When a candidate does
 *   stand bare, it becomes the citation (the strongest quote for the
 *   reviewer) and the claim is not routed.
 * - S2: every contradicted verdict — rare, terminal in stage 5, and the
 *   NLI's worst-precision class.
 * - Residual band: supported below RESIDUAL_SUPPORT_BAND (read on the
 *   cited candidate's bare score) — correct but strange cases that
 *   deserve a reviewer note.
 *
 * S3 (no site anchor) is aggregation's rule, not routing. When the LLM is
 * unavailable or a call fails, D6 applies: the NLI verdict stands,
 * `unreviewed` and `contextOnly` are reported, and aggregation withholds
 * a `verify` recommendation while any required sub-fact is context-only.
 */

/** Supported verdicts below this NLI probability are routed even when the bare candidate clears S1. */
export const RESIDUAL_SUPPORT_BAND = 0.5

export type RouteReason = 's1_context_only_support' | 's2_contradicted' | 'band_low_support'

export interface HybridOutcome {
  result: VerifierResult
  /** Why the claim went to the LLM; null when the NLI verdict stood on its own. */
  route: RouteReason | null
  /** True when a routed claim was not actually reviewed (LLM absent or call failed) — D6. */
  unreviewed: boolean
  /** S1 under D6: a support that exists only through the page-lead context, kept per D6. */
  contextOnly: boolean
}

/** What the hybrid needs from the NLI side; NliScorer satisfies it, tests stub it. */
export type PairScorer = Pick<NliScorer, 'scoreMany'>

export class HybridVerifier implements Verifier {
  constructor(
    private readonly scorer: PairScorer,
    private readonly llm: LlmVerifier,
    private readonly thresholds: NliThresholds = SMOKE_SET_THRESHOLDS,
    private readonly band: number = RESIDUAL_SUPPORT_BAND,
  ) {}

  async verify(input: VerifierInput): Promise<VerifierResult> {
    return (await this.verifyWithRoute(input)).result
  }

  async verifyWithRoute(input: VerifierInput): Promise<HybridOutcome> {
    const { hypothesis, candidates, context } = input
    if (candidates.length === 0) {
      return {
        result: {
          verdict: 'insufficient',
          candidate_index: null,
          start: null,
          end: null,
          score: null,
          note: 'no candidate sentences to score',
          path: 'nli',
        },
        route: null,
        unreviewed: false,
        contextOnly: false,
      }
    }

    const texts = candidates.map((candidate) => candidate.text)
    const contextual = await this.scorer.scoreMany(
      texts.map((text) => buildPremise(context, text)),
      hypothesis,
    )
    const decision = decideVerdict(contextual, this.thresholds)
    let standing = nliResult(decision, candidates)

    // S1 looks at the candidates on their own: a support is routed only
    // when NO candidate clears the supported threshold bare. When one
    // does, that self-sufficient candidate is the citation — not the
    // contextual winner — and the residual band reads its bare score.
    let route: RouteReason | null = null
    if (decision.verdict === 'contradicted') {
      route = 's2_contradicted'
    } else if (decision.verdict === 'supported') {
      const bare = context == null ? contextual : await this.scorer.scoreMany(texts, hypothesis)
      let bareIndex = 0
      for (const [index, scores] of bare.entries()) {
        if (scores.entailment > (bare[bareIndex]?.entailment ?? 0)) {
          bareIndex = index
        }
      }
      const bareBest = bare[bareIndex]?.entailment ?? 0
      if (bareBest < this.thresholds.supported) {
        route = 's1_context_only_support'
      } else {
        standing = nliResult({ verdict: 'supported', index: bareIndex, score: bareBest, note: decision.note }, candidates)
        route = bareBest < this.band ? 'band_low_support' : null
      }
    }

    if (route === null) {
      return { result: standing, route, unreviewed: false, contextOnly: false }
    }

    if (this.llm.available) {
      const reviewed = await this.llm.verify(input)
      const failed = reviewed.verdict === 'insufficient' && (reviewed.note?.startsWith(LLM_FAILURE_NOTE_PREFIX) ?? false)
      if (!failed) {
        return { result: reviewed, route, unreviewed: false, contextOnly: false }
      }
    }

    // D6: the NLI verdict stands — S2 contradictions included — with the
    // unreviewed route on the record for the reviewer and for aggregation.
    const reason = this.llm.available ? LLM_FAILURE_NOTE_PREFIX.toLowerCase() : LLM_UNAVAILABLE_NOTE
    return {
      result: { ...standing, note: joinNotes(standing.note, `${route} routed; unreviewed (${reason}); NLI verdict stands (D6)`) },
      route,
      unreviewed: true,
      contextOnly: route === 's1_context_only_support',
    }
  }
}

function joinNotes(first: string | null, second: string): string {
  return first === null ? second : `${first}; ${second}`
}
