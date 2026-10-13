import { requestJson } from './http'
import { ApiError } from './errors'
import type {
  AdminAccount,
  AdminCorrection,
  AdminProfile,
  CorrectionItem,
  NewAdministrator,
  ReviewDecision,
  ReviewQueueItem,
  ReviewRecord,
  SubmissionHistoryItem,
} from '../../features/admin/types'

// The backend refuses modifying admin requests without this header (CSRF protection).
const MODIFYING_HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }

interface ProfileDto {
  email: string
  role: 'root' | 'admin'
  must_change_password: boolean
}

function toProfile(dto: ProfileDto): AdminProfile {
  return { email: dto.email, role: dto.role, mustChangePassword: dto.must_change_password }
}

export async function signIn(email: string, password: string): Promise<AdminProfile> {
  const dto = await requestJson<ProfileDto>('admin/session', {
    method: 'POST',
    headers: MODIFYING_HEADERS,
    body: JSON.stringify({ email, password }),
  })
  return toProfile(dto)
}

/** The signed-in administrator, or null when there is no valid session. */
export async function getSession(): Promise<AdminProfile | null> {
  try {
    return toProfile(await requestJson<ProfileDto>('admin/session'))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function signOut(): Promise<void> {
  await requestJson<void>('admin/session', { method: 'DELETE', headers: MODIFYING_HEADERS })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AdminProfile> {
  const dto = await requestJson<ProfileDto>('admin/password', {
    method: 'POST',
    headers: MODIFYING_HEADERS,
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  return toProfile(dto)
}

interface QueueItemDto {
  id: number
  site_name: string
  country_code: string
  region: string | null
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  evidence_count: number
  submitted_at: string
  kind: 'submission' | 'correction'
  correction_id: number | null
  changed_fields: string[]
  contributor_email: string | null
  contributor_organisation: string | null
}

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const { items } = await requestJson<{ items: QueueItemDto[] }>('admin/reviews')
  return items.map((item) => ({
    id: item.id,
    siteName: item.site_name,
    countryCode: item.country_code,
    region: item.region,
    machineManufacturer: item.machine_manufacturer,
    machineModel: item.machine_model,
    machineType: item.machine_type,
    quantity: item.quantity,
    technologySupplier: item.technology_supplier,
    technologyProduct: item.technology_product,
    evidenceCount: item.evidence_count,
    submittedAt: item.submitted_at,
    kind: item.kind,
    correctionId: item.correction_id,
    changedFields: item.changed_fields,
    contributorEmail: item.contributor_email,
    contributorOrganisation: item.contributor_organisation,
  }))
}

interface RecordDto {
  id: number
  verification_status: string
  site_name: string
  country_code: string
  latitude?: number | null
  longitude?: number | null
  region: string | null
  commodity: string | null
  machine_manufacturer: string
  machine_model: string | null
  model_variant: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  automation_level: string | null
  environment: string | null
  installation_type: string
  status: string | null
  commissioning_date: string | null
  commissioning_year: number | null
  valid_from: string | null
  valid_to: string | null
  evidence: { url: string; source_type: string; publisher: string | null; published_date: string | null }[]
  reviews: { decision: ReviewDecision; note: string | null; administrator: string; reviewed_at: string; correction_id: number | null }[]
  revisions: {
    action: 'create' | 'update' | 'verification_change'
    previous_values: Record<string, unknown> | null
    change_note: string | null
    contributor_email: string | null
    contributor_organisation: string | null
    administrator: string | null
    changed_at: string
  }[]
  corrections: {
    id: number
    status: CorrectionItem['status']
    submitted_at: string
    contributor_email: string | null
    contributor_organisation: string | null
    change_note: string | null
    evidence_urls: string[]
    changes: CorrectionItem['changes']
  }[]
}

export async function getReviewRecord(id: number): Promise<ReviewRecord> {
  const dto = await requestJson<RecordDto>(`admin/deployments/${id}`)
  return {
    id: dto.id,
    verificationStatus: dto.verification_status,
    siteName: dto.site_name,
    countryCode: dto.country_code,
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
    region: dto.region,
    commodity: dto.commodity,
    machineManufacturer: dto.machine_manufacturer,
    machineModel: dto.machine_model,
    modelVariant: dto.model_variant,
    machineType: dto.machine_type,
    quantity: dto.quantity,
    technologySupplier: dto.technology_supplier,
    technologyProduct: dto.technology_product,
    automationLevel: dto.automation_level,
    environment: dto.environment,
    installationType: dto.installation_type,
    status: dto.status,
    commissioningDate: dto.commissioning_date,
    commissioningYear: dto.commissioning_year,
    validFrom: dto.valid_from,
    validTo: dto.valid_to,
    evidence: dto.evidence.map((item) => ({
      url: item.url,
      sourceType: item.source_type,
      publisher: item.publisher,
      publishedDate: item.published_date,
    })),
    reviews: dto.reviews.map((item) => ({
      decision: item.decision,
      note: item.note,
      administrator: item.administrator,
      reviewedAt: item.reviewed_at,
      correctionId: item.correction_id,
    })),
    revisions: dto.revisions.map((item) => ({
      action: item.action,
      previousValues: item.previous_values,
      changeNote: item.change_note,
      contributorEmail: item.contributor_email,
      contributorOrganisation: item.contributor_organisation,
      administrator: item.administrator,
      changedAt: item.changed_at,
    })),
    corrections: dto.corrections.map((item) => ({
      id: item.id,
      status: item.status,
      submittedAt: item.submitted_at,
      contributorEmail: item.contributor_email,
      contributorOrganisation: item.contributor_organisation,
      changeNote: item.change_note,
      evidenceUrls: item.evidence_urls,
      changes: item.changes,
    })),
  }
}

export async function submitDecision(id: number, decision: ReviewDecision, note: string): Promise<string> {
  const response = await requestJson<{ verification_status: string }>(`admin/deployments/${id}/reviews`, {
    method: 'POST',
    headers: MODIFYING_HEADERS,
    body: JSON.stringify({ decision, note: note.trim() || null }),
  })
  return response.verification_status
}

/** Decides a proposed correction; returns its new status. */
export async function submitCorrectionDecision(correctionId: number, decision: ReviewDecision, note: string): Promise<string> {
  const response = await requestJson<{ correction_status: string }>(`admin/corrections/${correctionId}/reviews`, {
    method: 'POST',
    headers: MODIFYING_HEADERS,
    body: JSON.stringify({ decision, note: note.trim() || null }),
  })
  return response.correction_status
}

export async function correctRecord(id: number, correction: AdminCorrection): Promise<string> {
  const body: Record<string, unknown> = {
    quantity: correction.quantity,
    environment: correction.environment,
    deployment_status: correction.deploymentStatus,
    automation_level: correction.automationLevel,
    valid_from: correction.validFrom,
    valid_to: correction.validTo,
    clear_valid_from: correction.clearValidFrom,
    clear_valid_to: correction.clearValidTo,
    installation_type: correction.installationType,
    commissioning_date: correction.commissioningDate,
    latitude: correction.latitude,
    longitude: correction.longitude,
    technology_supplier: correction.technologySupplier,
    technology_product: correction.technologyProduct,
    evidence_urls: correction.evidenceUrls,
    change_note: correction.changeNote,
  }
  const response = await requestJson<{ verification_status: string }>(`admin/deployments/${id}`, {
    method: 'PATCH',
    headers: MODIFYING_HEADERS,
    // JSON.stringify drops the fields left undefined
    body: JSON.stringify(body),
  })
  return response.verification_status
}

interface AccountDto {
  id: number
  email: string
  role: 'root' | 'admin'
  active: boolean
  must_change_password: boolean
  created_at: string
}

export async function listAdministrators(): Promise<AdminAccount[]> {
  const { items } = await requestJson<{ items: AccountDto[] }>('admin/users')
  return items.map((item) => ({
    id: item.id,
    email: item.email,
    role: item.role,
    active: item.active,
    mustChangePassword: item.must_change_password,
    createdAt: item.created_at,
  }))
}

/** Adds an administrator; the temporary password in the result is shown once. */
export async function addAdministrator(email: string): Promise<NewAdministrator> {
  const dto = await requestJson<{ id: number; email: string; temporary_password: string }>('admin/users', {
    method: 'POST',
    headers: MODIFYING_HEADERS,
    body: JSON.stringify({ email }),
  })
  return { id: dto.id, email: dto.email, temporaryPassword: dto.temporary_password }
}

export async function setAdministratorActive(id: number, active: boolean): Promise<void> {
  await requestJson(`admin/users/${id}`, {
    method: 'PATCH',
    headers: MODIFYING_HEADERS,
    body: JSON.stringify({ active }),
  })
}


/** Retrieves submission history, optionally filtered by an exact deployment ID. */
export async function getSubmissionHistory(
  limit = 50,
  offset = 0,
  id?: number,
): Promise<SubmissionHistoryItem[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  if (id !== undefined) params.set('id', String(id))

  const response = await requestJson<{ items: {
    id: number
    site_name: string
    country_code: string
    verification_status: string
    latest_decision: ReviewDecision | null
    latest_decision_is_correction: boolean | null
    updated_at: string
  }[] }>(`admin/submissions?${params.toString()}`)

  return response.items.map((item) => ({
    id: item.id,
    siteName: item.site_name,
    countryCode: item.country_code,
    verificationStatus: item.verification_status,
    latestDecision: item.latest_decision,
    latestDecisionIsCorrection: item.latest_decision_is_correction,
    updatedAt: item.updated_at,
  }))
}
