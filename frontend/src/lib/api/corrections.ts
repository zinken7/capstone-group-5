import type { CorrectionTracking } from '../../features/contribute/types'
import type { EquipmentRecord } from '../../features/equipment/types'
import { formatEnumLabel } from '../format'
import { getApiBaseUrl } from './config'
import { ApiError, fieldMessages } from './errors'
import { requestJson } from './http'
import { toEquipmentRecord } from './register'
import type { RegisterItemDto } from './register'

export interface CorrectionPayload {
  quantity?: number
  environment?: string
  deploymentStatus?: string
  automationLevel?: string
  installationType?: string
  commissioningDate?: string
  evidenceUrls?: string[]
  contributorEmail?: string
  organisation?: string
  changeNote?: string
  disclosureAccepted: true
}

export interface CorrectionResult {
  id: number
  /** Set when the record is verified: the change is a proposal, and the record stays public and unchanged until reviewed */
  correctionId: number | null
  verificationStatus: string
  /** The proposal's private key, returned once; kept in this browser to follow it (FR-59, #223) */
  key: string | null
}

export class CorrectionApiError extends ApiError {
  constructor(message: string, status: number | undefined, fields: Record<string, string> = {}) {
    super(message, status, { fields })
    this.name = 'CorrectionApiError'
  }
}

export async function submitCorrection(id: number, payload: CorrectionPayload): Promise<CorrectionResult> {
  const body = {
    quantity: payload.quantity,
    environment: payload.environment,
    deployment_status: payload.deploymentStatus,
    automation_level: payload.automationLevel,
    installation_type: payload.installationType,
    commissioning_date: payload.commissioningDate,
    evidence_urls: payload.evidenceUrls,
    contributor_email: payload.contributorEmail,
    organisation: payload.organisation,
    change_note: payload.changeNote,
    disclosure_accepted: payload.disclosureAccepted,
  }

  let response: Response
  try {
    response = await fetch(`${getApiBaseUrl()}/deployments/${id}`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new CorrectionApiError('Unable to reach the API', undefined, {})
  }

  let responseBody: unknown = undefined
  try {
    responseBody = await response.json()
  } catch {
    // Keep a useful status-based message when the response is not JSON.
  }

  if (!response.ok) {
    const object = typeof responseBody === 'object' && responseBody !== null ? responseBody as Record<string, unknown> : {}
    const fields = fieldMessages(object)
    const message = typeof object.error === 'string' && object.error.trim() ? object.error : `API request failed (${response.status})`
    throw new CorrectionApiError(message, response.status, fields)
  }

  const object = typeof responseBody === 'object' && responseBody !== null ? responseBody as Record<string, unknown> : {}
  return {
    id: typeof object.id === 'number' ? object.id : id,
    correctionId: typeof object.correction_id === 'number' ? object.correction_id : null,
    verificationStatus: typeof object.verification_status === 'string' ? object.verification_status : 'pending_review',
    key: typeof object.key === 'string' ? object.key : null,
  }
}

interface CorrectionTrackingDto {
  id: number
  deployment_id: number
  status: string
  submitted_at: string
  site_id: number
  site_name: string
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  change_note: string | null
  evidence_urls: string[]
  changes: { field: string; before: unknown; proposed: unknown }[]
  decision: { decision: string; note: string | null; decided_at: string } | null
}

function toTracking(dto: CorrectionTrackingDto): CorrectionTracking {
  return {
    id: dto.id,
    deploymentId: dto.deployment_id,
    status: dto.status,
    submittedAt: dto.submitted_at,
    siteId: dto.site_id,
    siteName: dto.site_name,
    machine: dto.machine_model ? `${dto.machine_manufacturer} ${dto.machine_model}` : `${dto.machine_manufacturer} ${formatEnumLabel(dto.machine_type)}`,
    changeNote: dto.change_note,
    evidenceUrls: dto.evidence_urls,
    changes: dto.changes,
    decision: dto.decision && { decision: dto.decision.decision, note: dto.decision.note, decidedAt: dto.decision.decided_at },
  }
}

/** The proposed corrections whose keys match, at most 50 per request; any other is left out (#223). */
export async function checkCorrectionStatuses(items: readonly { id: number; key: string }[]): Promise<CorrectionTracking[]> {
  const response = await requestJson<{ items: CorrectionTrackingDto[] }>('corrections/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return response.items.map(toTracking)
}

/** One's own proposed correction, with the record as the register shows it, to propose again from. */
export async function getOwnCorrection(id: number, key: string): Promise<CorrectionTracking & { record: EquipmentRecord | null }> {
  const dto = await requestJson<CorrectionTrackingDto & { record: RegisterItemDto | null }>(`corrections/${id}`, { headers: { 'X-Contribution-Key': key } })
  return { ...toTracking(dto), record: dto.record && toEquipmentRecord(dto.record) }
}
