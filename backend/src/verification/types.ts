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
