import type { ClaimField, EvidenceType, FieldVerdict, Recommendation } from './types.js'
import type { Verdict } from './verifier/types.js'

/**
 * Stage 5 — aggregate (design §6 stage 5, amended 2026-10-03). Pure
 * functions from per-claim verdicts to field verdicts and a recommendation;
 * every rule that fires is named in words in the basis. This is the only
 * place D3 (dated contradictions), D4 (source class), S3 (site anchor) and
 * D6 (unreviewed context-only support) are decided.
 */

export interface ClaimOutcome {
  field: ClaimField
  subject: string
  subFact: string
  required: boolean
  verdict: Verdict
  /** From the hybrid (D6): a support that exists only through page-lead context and was not LLM-reviewed. */
  contextOnly: boolean
}

export interface AggregateSource {
  /** YYYY-MM-DD, when the page carried one. */
  publishedDate: string | null
  sourceClass: EvidenceType | null
}

export interface AggregateInput {
  claims: readonly ClaimOutcome[]
  source: AggregateSource
  /** The submission's commissioning field; D3 compares the source date against it. */
  commissioning: { year: number; month: number | null } | null
}

export interface AggregateResult {
  /** Claims after the S3 cap; what stage 6 stores. */
  claims: ClaimOutcome[]
  /** Which claims S3 capped (same order as `claims`). */
  capped: boolean[]
  fieldVerdicts: Partial<Record<ClaimField, FieldVerdict>>
  recommendation: Recommendation
  recommendationBasis: string
}

/** D4: the source classes that can carry a `verify` recommendation. */
export const QUALIFYING_SOURCE_CLASSES: readonly EvidenceType[] = ['company_release', 'government', 'academic', 'news']

export const SITE_ANCHOR_NOTE = 'source never names the site'

/**
 * S3: a source that supports neither site.name nor site.country anchors
 * nothing; every non-site verdict from it is capped at insufficient. A
 * deterministic rule, deliberately not an LLM question.
 */
export function hasSiteAnchor(claims: readonly ClaimOutcome[]): boolean {
  return claims.some(
    (claim) => claim.field === 'site' && (claim.subFact === 'name' || claim.subFact === 'country') && claim.verdict === 'supported',
  )
}

function applySiteAnchor(claims: readonly ClaimOutcome[]): { claims: ClaimOutcome[]; capped: boolean[] } {
  if (hasSiteAnchor(claims)) {
    return { claims: [...claims], capped: claims.map(() => false) }
  }
  const capped = claims.map((claim) => claim.field !== 'site' && claim.verdict !== 'insufficient')
  return {
    claims: claims.map((claim, index) =>
      capped[index] === true ? { ...claim, verdict: 'insufficient' as const, contextOnly: false } : claim,
    ),
    capped,
  }
}

/** D3's date guard: an explicitly different value in a source older than the deployment is an older figure, not a contradiction. */
function isOlderFigure(source: AggregateSource, commissioning: AggregateInput['commissioning']): boolean {
  if (source.publishedDate === null || commissioning === null) {
    return false
  }
  const month = String(commissioning.month ?? 1).padStart(2, '0')
  return source.publishedDate < `${commissioning.year}-${month}-01`
}

/**
 * The §6 stage 5 field table, rows in order. D3 is evaluated per field,
 * across all of the field's sub-facts together: with the older-figure
 * exemption a conflicting value reads "partial (older figure)", never
 * better and never a contradiction.
 */
export function fieldVerdict(claims: readonly ClaimOutcome[], olderFigure: boolean): FieldVerdict {
  const contradicted = claims.some((claim) => claim.verdict === 'contradicted')
  if (contradicted) {
    return olderFigure ? 'partially_supported' : 'contradicted'
  }

  const supported = (claim: ClaimOutcome): boolean => claim.verdict === 'supported'
  const required = claims.filter((claim) => claim.required)
  const optional = claims.filter((claim) => !claim.required)
  const allRequired = required.length > 0 && required.every(supported)

  if (allRequired && optional.every(supported)) {
    return 'supported'
  }
  if (allRequired || required.some(supported)) {
    return 'partially_supported'
  }
  if (claims.some(supported)) {
    // Not a row of the design table: only optional sub-facts supported.
    // "No sub-fact supported → insufficient" implies this reads partial.
    return 'partially_supported'
  }
  return 'insufficient'
}

const FIELD_ORDER: readonly ClaimField[] = ['site', 'company_role', 'machine', 'technology', 'quantity', 'commissioning']

export function aggregate(input: AggregateInput): AggregateResult {
  const { claims, capped } = applySiteAnchor(input.claims)
  const olderFigure = isOlderFigure(input.source, input.commissioning)

  const fieldVerdicts: Partial<Record<ClaimField, FieldVerdict>> = {}
  for (const field of FIELD_ORDER) {
    const fieldClaims = claims.filter((claim) => claim.field === field)
    if (fieldClaims.length > 0) {
      fieldVerdicts[field] = fieldVerdict(fieldClaims, olderFigure)
    }
  }

  const { recommendation, recommendationBasis } = recommend(fieldVerdicts, claims, input.source, olderFigure)
  return { claims, capped, fieldVerdicts, recommendation, recommendationBasis }
}

/**
 * The §6 stage 5 recommendation table, rules in order; everything that is
 * neither `verify` nor a gate `reject` is request_more_evidence, so the
 * rules mostly choose the basis wording. The spam-gate `reject` row lives
 * in the pipeline, which never reaches aggregation on a gate failure.
 */
function recommend(
  fieldVerdicts: Partial<Record<ClaimField, FieldVerdict>>,
  claims: readonly ClaimOutcome[],
  source: AggregateSource,
  olderFigure: boolean,
): { recommendation: Recommendation; recommendationBasis: string } {
  const contradictedFields = FIELD_ORDER.filter((field) => fieldVerdicts[field] === 'contradicted')
  if (contradictedFields.length > 0) {
    return {
      recommendation: 'request_more_evidence',
      recommendationBasis: `the source states a different value for: ${contradictedFields.join(', ')}`,
    }
  }

  const site = fieldVerdicts.site
  const coreSupported =
    site === 'supported' &&
    fieldVerdicts.technology === 'supported' &&
    (fieldVerdicts.quantity === 'supported' || fieldVerdicts.quantity === 'partially_supported')

  if (coreSupported) {
    const classQualifies = source.sourceClass !== null && QUALIFYING_SOURCE_CLASSES.includes(source.sourceClass)
    if (!classQualifies) {
      return {
        recommendation: 'request_more_evidence',
        recommendationBasis: `site, technology and quantity are supported, but the source class (${source.sourceClass ?? 'unknown'}) does not qualify (D4)`,
      }
    }
    // D6, narrowed to non-site fields (2026-10-03): the page lead names the
    // site, so site-fact coreference is direct and S3 anchors the site
    // independently; the fleet-wide-import risk D6 guards against lives in
    // the other fields.
    const unreviewed = claims.filter(
      (claim) => claim.field !== 'site' && claim.required && claim.contextOnly && claim.verdict === 'supported',
    )
    if (unreviewed.length > 0) {
      return {
        recommendation: 'request_more_evidence',
        recommendationBasis: `required sub-facts are supported only through page context and unreviewed (D6): ${unreviewed
          .map((claim) => `${claim.field}.${claim.subFact}`)
          .join(', ')}`,
      }
    }
    return {
      recommendation: 'verify',
      recommendationBasis: `site and technology supported, quantity ${fieldVerdicts.quantity === 'supported' ? 'supported' : 'partial'}${olderFigure ? ' (older source figure tolerated, D3)' : ''}, qualifying ${source.sourceClass ?? ''} source`,
    }
  }

  if (site === 'supported') {
    return {
      recommendation: 'request_more_evidence',
      recommendationBasis: 'the site is supported but the remaining fields are not established by this source',
    }
  }
  if (site === 'insufficient' || site === undefined) {
    return {
      recommendation: 'request_more_evidence',
      recommendationBasis: 'the source does not establish the site itself',
    }
  }
  return {
    recommendation: 'request_more_evidence',
    recommendationBasis: `the site is only ${site === 'partially_supported' ? 'partially supported' : site} by this source`,
  }
}
