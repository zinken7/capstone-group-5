import type { Sentence } from '../retrieve.js'

/**
 * Stage 4 — the verifier interface (docs/verification/fr55-design.md §4.4).
 *
 * Two implementations are planned: NliVerifier (build step 3) and
 * LlmVerifier (build step 4); the hybrid composes them by threshold. All
 * three take the same input and produce the same row shape, so aggregation,
 * storage and the review panel never care which path ran (design §4.2).
 */

/** Matches the CHECK on verification_claim.verdict in migration 003. */
export const VERDICTS = ['supported', 'contradicted', 'insufficient'] as const
export type Verdict = (typeof VERDICTS)[number]

/** Matches the CHECK on verification_claim.path in migration 003. */
export const VERIFIER_PATHS = ['nli', 'llm'] as const
export type VerifierPath = (typeof VERIFIER_PATHS)[number]

/**
 * A numbered sentence with offsets into the stored source text — stage 3's
 * output, as the design names it in §4.4.
 */
export type Candidate = Sentence

export interface VerifierInput {
  /** One sub-fact's hypothesis sentence, e.g. "There is a mine site named Wandarra Iron." */
  hypothesis: string
  candidates: readonly Candidate[]
  /**
   * Proposed §4.4 amendment, pending review: the page's lead sentence. A
   * candidate rarely restates the site's name ("the mine runs 36 trucks"),
   * so sentence-alone NLI reads nearly every site-naming hypothesis as
   * neutral; prepending the lead when scoring — FEVER-style evidence
   * context — resolves the reference. The cited quote is still the
   * candidate alone (R1); the context never appears in a span.
   */
  context?: string | null
}

export interface VerifierResult {
  verdict: Verdict
  /** Index into `candidates` of the cited span; null when nothing is cited. */
  candidate_index: number | null
  /** Offsets of the quote within the cited candidate's text (design R1). */
  start: number | null
  end: number | null
  /** NLI entailment score when available. */
  score: number | null
  note: string | null
  path: VerifierPath
}

export interface Verifier {
  verify(input: VerifierInput): Promise<VerifierResult>
}
