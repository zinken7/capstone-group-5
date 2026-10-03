import { SITE_ANCHOR_NOTE, aggregate, type ClaimOutcome } from './aggregate.js'
import { decompose, type Submission } from './decompose.js'
import { retrieve, splitSentences, type AliasMap } from './retrieve.js'
import { fetchSource, type FetchedSource } from './sources.js'
import type { ReportRef, ReportStore, StoredClaim, VerificationReport } from './store.js'
import type { SpamGateResult } from './types.js'
import type { HybridVerifier } from './verifier/hybrid.js'
import { LLM_MODEL_ID, PROMPT_VERSION } from './verifier/llm.js'
import { DEFAULT_NLI_MODEL_ID } from './verifier/nli.js'

/**
 * Stages 0–6 in one function (design §4.1): spam gate, fetch, decompose,
 * retrieve, verify (hybrid), aggregate, store. Everything but stage 4 is
 * deterministic code; nothing here ever touches
 * deployment.verification_status (R3). Triggered manually (CLI) — the
 * queue and the API trigger are a separate team decision.
 */

export interface VerificationJob {
  submission: Submission
  evidenceUrl: string | null
  /** The submission's free-text field; spam gate rule 4. */
  freeText?: string | null
}

export interface PipelineOptions {
  /** Stage 4; the pipeline only needs the routed form (tests stub it). */
  verifier: Pick<HybridVerifier, 'verifyWithRoute'>
  store: ReportStore
  aliasMap?: AliasMap
  /** Injectable stage 1; defaults to the live fetchSource. Smoke runs inject stored pages. */
  fetch?: (url: string) => Promise<FetchedSource>
  /** Spam gate rule 3; suffix-matched hostnames. Empty by default. */
  junkDomains?: readonly string[]
  /** Candidates per sub-fact; 3 matches the stage-2 retrieval guarantee. */
  topK?: number
  /** Database ids for the Postgres store; the in-memory store does not need them. */
  ref?: ReportRef
  now?: () => Date
}

const DEFAULT_TOP_K = 3

const GATE_REASONS: Record<Exclude<SpamGateResult, 'passed'>, string> = {
  no_url: 'no evidence URL, or the URL does not parse',
  unresolvable_url: 'the URL does not resolve, after the archive fallback',
  junk_domain: 'the evidence domain is on the junk list',
  links_only: 'the free text is only links',
}

export async function runVerification(
  job: VerificationJob,
  options: PipelineOptions,
): Promise<{ report: VerificationReport; reportId: number }> {
  const now = options.now ?? (() => new Date())
  const doFetch = options.fetch ?? ((url: string) => fetchSource(url))

  // Stage 0 rule 1 fails before any fetch; rule 2 needs stage 1's outcome
  // (including the archive fallback), so the gate brackets the fetch.
  if (job.evidenceUrl === null || !parses(job.evidenceUrl)) {
    return reject('no_url', null, options, now)
  }
  const source = await doFetch(job.evidenceUrl)
  if (source.extractedText === null) {
    return reject('unresolvable_url', source, options, now)
  }
  if (isJunkDomain(job.evidenceUrl, options.junkDomains ?? [])) {
    return reject('junk_domain', source, options, now)
  }
  if (isLinksOnly(job.freeText ?? null)) {
    return reject('links_only', source, options, now)
  }

  // Stages 2–4: decompose to sub-facts, retrieve candidates, verify.
  const claims = decompose(job.submission)
  const sentences = splitSentences(source.extractedText)
  const context = sentences[0]?.text ?? null
  const topK = options.topK ?? DEFAULT_TOP_K

  const stored: StoredClaim[] = []
  const outcomes: ClaimOutcome[] = []
  for (const claim of claims) {
    const candidates = retrieve(claim.terms, sentences, { aliasMap: options.aliasMap, topK })
    if (candidates.length === 0) {
      // Stage 4 skipped (design §6 stage 3): path is null, nothing cited.
      stored.push({ ...base(claim), verdict: 'insufficient', quoteStart: null, quoteEnd: null, score: null, path: null, note: 'no candidate sentences retrieved' })
      outcomes.push({ ...base(claim), verdict: 'insufficient', contextOnly: false })
      continue
    }

    const { result, contextOnly } = await options.verifier.verifyWithRoute({ hypothesis: claim.hypothesis, candidates, context })
    const cited = result.candidate_index === null ? null : (candidates[result.candidate_index] ?? null)
    stored.push({
      ...base(claim),
      verdict: result.verdict,
      // §4.4 offsets are within the candidate; the stored quote is absolute
      // into extractedText (migration 003), hence the shift by the
      // candidate's own offset.
      quoteStart: cited === null || result.start === null ? null : cited.start + result.start,
      quoteEnd: cited === null || result.end === null ? null : cited.start + result.end,
      score: result.score,
      path: result.path,
      note: result.note,
    })
    outcomes.push({ ...base(claim), verdict: result.verdict, contextOnly })
  }

  // Stage 5: S3, field verdicts (D3 dates in code), recommendation.
  const aggregated = aggregate({
    claims: outcomes,
    source: { publishedDate: source.publishedDate, sourceClass: source.sourceClass },
    commissioning: job.submission.commissioning,
  })
  for (const [index, capped] of aggregated.capped.entries()) {
    const row = stored[index]
    if (capped && row !== undefined) {
      row.verdict = 'insufficient'
      row.note = row.note === null ? SITE_ANCHOR_NOTE : `${row.note}; ${SITE_ANCHOR_NOTE}`
    }
  }

  const usedLlm = stored.some((row) => row.path === 'llm')
  const report: VerificationReport = {
    spamGateResult: 'passed',
    recommendation: aggregated.recommendation,
    recommendationBasis: aggregated.recommendationBasis,
    fieldVerdicts: aggregated.fieldVerdicts,
    modelName: `nli:${DEFAULT_NLI_MODEL_ID}${usedLlm ? ` + llm:${LLM_MODEL_ID}` : ''}`,
    promptVersion: usedLlm ? PROMPT_VERSION : null,
    generatedAt: now(),
    source,
    claims: stored,
  }
  const { reportId } = await options.store.save(report, options.ref)
  return { report, reportId }
}

function base(claim: { field: StoredClaim['field']; subject: string; subFact: string; required: boolean; hypothesis: string }) {
  return {
    field: claim.field,
    subject: claim.subject,
    subFact: claim.subFact,
    required: claim.required,
    hypothesis: claim.hypothesis,
  }
}

async function reject(
  gate: Exclude<SpamGateResult, 'passed'>,
  source: FetchedSource | null,
  options: PipelineOptions,
  now: () => Date,
): Promise<{ report: VerificationReport; reportId: number }> {
  const detail = source?.failure === null || source?.failure === undefined ? '' : ` (${source.failure})`
  const report: VerificationReport = {
    spamGateResult: gate,
    recommendation: 'reject',
    recommendationBasis: `spam gate: ${GATE_REASONS[gate]}${detail}`,
    fieldVerdicts: {},
    modelName: null,
    promptVersion: null,
    generatedAt: now(),
    source,
    claims: [],
  }
  const { reportId } = await options.store.save(report, options.ref)
  return { report, reportId }
}

function parses(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isJunkDomain(url: string, junkDomains: readonly string[]): boolean {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  return junkDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

/** Gate rule 4: free text that is nothing but URLs. Empty free text is not spam. */
export function isLinksOnly(freeText: string | null): boolean {
  if (freeText === null || freeText.trim() === '') {
    return false
  }
  return freeText.replace(/(?:https?:\/\/|www\.)\S+/gi, '').trim() === ''
}
