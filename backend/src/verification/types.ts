// Vocabularies for the FR-55 verification module (docs/verification/fr55-design.md).
// Runtime arrays with derived types, so zod schemas, the pipeline and the
// database writer cannot disagree — the same pattern as src/types.ts enums.

/**
 * Mirrors the ERD's `evidence_type` enum (docs/database/ERD.md, controlled
 * values); migration 003 reuses it for `fetched_source.source_class`.
 */
export const EVIDENCE_TYPES = ['company_release', 'news', 'academic', 'government', 'report', 'other'] as const
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

/** The checkable fields of a submission; matches the CHECK on verification_claim.field in migration 003. */
export const CLAIM_FIELDS = ['site', 'company_role', 'machine', 'technology', 'quantity', 'commissioning'] as const
export type ClaimField = (typeof CLAIM_FIELDS)[number]

// Runtime copies of two src/types.ts unions, needed here because zod schemas
// want values, not types. The module is built standalone (integration is a
// separate decision); when the seed loader's const-array types.ts lands,
// these move there and are imported instead.
export const COMPANY_ROLES = ['owner', 'operator', 'contractor'] as const
export type CompanyRole = (typeof COMPANY_ROLES)[number]

/** 'passed', or the first stage-0 rule that failed; matches the CHECK on verification_report.spam_gate_result. */
export const SPAM_GATE_RESULTS = ['passed', 'no_url', 'unresolvable_url', 'junk_domain', 'links_only'] as const
export type SpamGateResult = (typeof SPAM_GATE_RESULTS)[number]

/** Matches the CHECK on verification_report.recommendation in migration 003. */
export const RECOMMENDATIONS = ['verify', 'request_more_evidence', 'reject'] as const
export type Recommendation = (typeof RECOMMENDATIONS)[number]

/** Field-level verdicts computed by aggregation (design §6 stage 5); stored in verification_report.field_verdicts. */
export const FIELD_VERDICTS = ['supported', 'partially_supported', 'contradicted', 'insufficient'] as const
export type FieldVerdict = (typeof FIELD_VERDICTS)[number]

export const MACHINE_TYPES = [
  'haul_truck',
  'lhd',
  'loader',
  'dozer',
  'excavator',
  'drill',
  'scaler',
  'shotcrete_machine',
  'other',
] as const
export type MachineType = (typeof MACHINE_TYPES)[number]
