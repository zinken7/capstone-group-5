// Vocabularies for the FR-55 verification module (docs/verification/fr55-design.md).
// Runtime arrays with derived types, so zod schemas, the pipeline and the
// database writer cannot disagree — the same pattern as src/types.ts enums.

/**
 * Mirrors the ERD's `evidence_type` enum (docs/database/ERD.md, controlled
 * values); migration 003 reuses it for `fetched_source.source_class`.
 */
export const EVIDENCE_TYPES = ['company_release', 'news', 'academic', 'government', 'report', 'other'] as const
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]
