export type AdminRole = 'root' | 'admin'

export interface AdminProfile {
  email: string
  role: AdminRole
  mustChangePassword: boolean
}

export interface ReviewQueueItem {
  id: number
  siteName: string
  countryCode: string
  region: string | null
  machineManufacturer: string
  machineModel: string | null
  machineType: string
  quantity: number
  technologySupplier: string | null
  technologyProduct: string | null
  evidenceCount: number
  submittedAt: string
  /** A new or returned record, or a proposed correction to a verified one. */
  kind: 'submission' | 'correction'
  correctionId: number | null
  /** API field names a correction would change; empty for a submission. */
  changedFields: string[]
  /** The contributor's update answers a request for changes */
  afterChangesRequested: boolean
  /** The contributor changed the record while it waited */
  updatedWhilePending: boolean
  /** The rejected record this submission replaces */
  resubmissionOf: number | null
  contributorEmail: string | null
  contributorOrganisation: string | null
}

export interface EvidenceItem {
  url: string
  sourceType: string
  publisher: string | null
  publishedDate: string | null
}

export interface ReviewHistoryItem {
  decision: ReviewDecision
  note: string | null
  administrator: string
  reviewedAt: string
  /** Set when the decision was on a proposed correction rather than the record. */
  correctionId: number | null
}

export interface CorrectionChange {
  field: string
  /** When the correction was submitted */
  before: unknown
  proposed: unknown
  /** The record now; differs from before when the record changed since */
  current: unknown
}

export interface CorrectionItem {
  id: number
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes'
  submittedAt: string
  contributorEmail: string | null
  contributorOrganisation: string | null
  changeNote: string | null
  evidenceUrls: string[]
  changes: CorrectionChange[]
}

export interface RevisionHistoryItem {
  action: 'create' | 'update' | 'verification_change'
  previousValues: Record<string, unknown> | null
  changeNote: string | null
  contributorEmail: string | null
  contributorOrganisation: string | null
  administrator: string | null
  changedAt: string
}

export interface ReviewRecord {
  id: number
  verificationStatus: string
  siteName: string
  countryCode: string
  latitude: number | null
  longitude: number | null
  region: string | null
  commodity: string | null
  machineManufacturer: string
  machineModel: string | null
  modelVariant: string | null
  machineType: string
  quantity: number
  technologySupplier: string | null
  technologyProduct: string | null
  /** The rejected record this one replaces, with the decision that closed it */
  resubmissionOf: {
    id: number
    verificationStatus: string
    decision: string | null
    note: string | null
    administrator: string | null
    reviewedAt: string | null
  } | null
  /** Records submitted to replace this one */
  resubmittedAs: { id: number; verificationStatus: string }[]
  possibleDuplicates: {
    id: number
    verificationStatus: string
    machineManufacturer: string
    machineModel: string | null
    machineType: string
    technologyProduct: string | null
    quantity: number
    commissioningDate: string | null
    status: string
  }[]
  automationLevel: string | null
  environment: string | null
  installationType: string
  status: string | null
  commissioningDate: string | null
  commissioningYear: number | null
  validFrom: string | null
  validTo: string | null
  /** The version a decision is made on; a later change refuses it */
  updatedAt: string
  evidence: EvidenceItem[]
  reviews: ReviewHistoryItem[]
  revisions: RevisionHistoryItem[]
  corrections: CorrectionItem[]
}

export type ReviewDecision = 'approved' | 'rejected' | 'needs_changes'

/** Fields an administrator may correct; omitted fields stay as they are. */
export interface AdminCorrection {
  quantity?: number
  environment?: string
  deploymentStatus?: string
  automationLevel?: string
  /** Administrator-only validity-window changes; omitted fields remain unchanged. */
  validFrom?: string
  validTo?: string
  clearValidFrom?: boolean
  clearValidTo?: boolean
  installationType?: string
  commissioningDate?: string
  latitude?: number
  longitude?: number
  technologySupplier?: string
  technologyProduct?: string
  evidenceUrls?: string[]
  changeNote?: string
}

export interface AdminAccount {
  id: number
  email: string
  role: AdminRole
  active: boolean
  mustChangePassword: boolean
  createdAt: string
}

export interface NewAdministrator {
  id: number
  email: string
  temporaryPassword: string
}


/** Columns the submission history can be sorted by. */
export type SubmissionHistorySort = 'id' | 'site' | 'decision' | 'status' | 'updated'

export interface SubmissionHistoryItem {
  id: number
  siteName: string
  countryCode: string
  verificationStatus: string
  latestDecision: ReviewDecision | null
  latestDecisionIsCorrection: boolean | null
  updatedAt: string
}
