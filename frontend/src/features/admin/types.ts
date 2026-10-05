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
  kind?: 'submission' | 'correction' | string
  changedFields?: string[]
  contributorEmail?: string | null
  contributorOrganisation?: string | null
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
  region: string | null
  commodity: string | null
  machineManufacturer: string
  machineModel: string | null
  modelVariant: string | null
  machineType: string
  quantity: number
  technologySupplier: string | null
  technologyProduct: string | null
  automationLevel: string | null
  environment: string | null
  installationType: string
  status: string | null
  commissioningDate: string | null
  commissioningYear: number | null
  validFrom: string | null
  validTo: string | null
  evidence: EvidenceItem[]
  reviews: ReviewHistoryItem[]
  revisions: RevisionHistoryItem[]
}

export type ReviewDecision = 'approved' | 'rejected' | 'needs_changes'

/** Fields an administrator may correct; omitted fields stay as they are. */
export interface AdminCorrection {
  quantity?: number
  environment?: string
  deploymentStatus?: string
  automationLevel?: string
  installationType?: string
  commissioningDate?: string
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
