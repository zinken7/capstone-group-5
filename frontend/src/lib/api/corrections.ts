import { getApiBaseUrl } from './config'
import { ApiError } from './errors'

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
  verificationStatus: string
}

export class CorrectionApiError extends ApiError {
  readonly fields: Record<string, string>

  constructor(message: string, status: number | undefined, fields: Record<string, string> = {}) {
    super(message, status)
    this.name = 'CorrectionApiError'
    this.fields = fields
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
    const fields = typeof object.fields === 'object' && object.fields !== null
      ? Object.fromEntries(Object.entries(object.fields).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      : {}
    const message = typeof object.error === 'string' && object.error.trim() ? object.error : `API request failed (${response.status})`
    throw new CorrectionApiError(message, response.status, fields)
  }

  const object = typeof responseBody === 'object' && responseBody !== null ? responseBody as Record<string, unknown> : {}
  return {
    id: typeof object.id === 'number' ? object.id : id,
    verificationStatus: typeof object.verification_status === 'string' ? object.verification_status : 'pending_review',
  }
}
