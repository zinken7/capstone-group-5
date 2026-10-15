import { requestJson } from './http'
import type {
  ContributionFormValues,
  ContributionStatus,
  ContributionSubmissionResult,
  ContributionVerificationStatus,
  OwnContribution,
  OwnContributionUpdate,
} from '../../features/contribute/types'
import { formatEnumLabel } from '../format'

interface ContributionResponseDto {
  id?: number
  verification_status?: string
  verificationStatus?: string
  key?: string
}

interface ContributionRequestDto {
  site_name: string
  country_code: string
  latitude: number | null
  longitude: number | null
  region: string | null
  commodity: string | null
  machine_type: string
  machine_manufacturer: string
  machine_model: string | null
  machine_model_variant: string | null
  quantity: number
  environment: string | null
  deployment_status: string | null
  automation_level: string | null
  installation_type: string | null
  technology_supplier: string | null
  technology_product: string | null
  commissioning_date: string | null
  evidence_urls: string[]
  contributor_email: string | null
  organisation: string | null
  disclosure_accepted: boolean
}

function toContributionRequest(values: ContributionFormValues): ContributionRequestDto {
  return {
    site_name: values.siteName.trim(),
    country_code: values.countryCode.trim().toUpperCase(),
    latitude: values.latitude.trim() ? Number(values.latitude) : null,
    longitude: values.longitude.trim() ? Number(values.longitude) : null,
    region: values.region.trim() || null,
    commodity: values.commodity.trim() || null,
    machine_type: values.machineType,
    machine_manufacturer: values.manufacturer.trim(),
    machine_model: values.machineModel.trim() || null,
    machine_model_variant: values.machineModelVariant.trim() || null,
    quantity: Number(values.quantity),
    environment: values.environment || null,
    deployment_status: values.deploymentStatus || null,
    automation_level: values.automationLevel || null,
    installation_type: values.installationType || null,
    technology_supplier: values.technologySupplier.trim() || null,
    technology_product: values.technologyProduct.trim() || null,
    commissioning_date: values.commissioningDate.trim() || null,
    evidence_urls: values.evidenceUrls.map((url) => url.trim()).filter(Boolean),
    contributor_email: values.email.trim() || null,
    organisation: values.organisation.trim() || null,
    disclosure_accepted: values.disclosureAccepted,
  }
}

function verificationStatus(value: string | undefined): ContributionVerificationStatus {
  if (value === 'unverified' || value === 'pending_review' || value === 'changes_requested' || value === 'verified' || value === 'rejected') {
    return value
  }
  return 'pending_review'
}

/**
 * Submit a contribution through the Sprint 3 backend contract.
 * The endpoint is implemented by backend Issue #64; until then, the API error
 * is surfaced by the page rather than being presented as a false success.
 */
export async function postContribution(values: ContributionFormValues): Promise<ContributionSubmissionResult> {
  const response = await requestJson<ContributionResponseDto>('contributions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toContributionRequest(values)),
  })

  return {
    id: typeof response.id === 'number' ? response.id : undefined,
    verificationStatus: verificationStatus(response.verification_status ?? response.verificationStatus),
    key: typeof response.key === 'string' ? response.key : undefined,
  }
}

interface ContributionStatusDto {
  id: number
  verification_status: string
  site_id: number
  site_name: string
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  quantity: number
  submitted_at: string
  updated_at: string
  decision: { decision: string; note: string | null; decided_at: string } | null
}

interface OwnContributionDto extends ContributionStatusDto {
  latitude: number | null
  longitude: number | null
  environment: string | null
  deployment_status: string | null
  automation_level: string
  installation_type: string
  commissioning_date: string | null
  evidence_urls: string[]
}

function toStatus(dto: ContributionStatusDto): ContributionStatus {
  return {
    id: dto.id,
    verificationStatus: dto.verification_status,
    siteId: dto.site_id,
    siteName: dto.site_name,
    machine: dto.machine_model ? `${dto.machine_manufacturer} ${dto.machine_model}` : `${dto.machine_manufacturer} ${formatEnumLabel(dto.machine_type)}`,
    quantity: dto.quantity,
    submittedAt: dto.submitted_at,
    updatedAt: dto.updated_at,
    decision: dto.decision && { decision: dto.decision.decision, note: dto.decision.note, decidedAt: dto.decision.decided_at },
  }
}

/** The submissions whose keys match, at most 50 per request; any other is left out (FR-59). */
export async function checkContributionStatuses(items: readonly { id: number; key: string }[]): Promise<ContributionStatus[]> {
  const response = await requestJson<{ items: ContributionStatusDto[] }>('contributions/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return response.items.map(toStatus)
}

/** One's own submission, with the values the update form starts from. */
export async function getOwnContribution(id: number, key: string): Promise<OwnContribution> {
  const dto = await requestJson<OwnContributionDto>(`contributions/${id}`, { headers: { 'X-Contribution-Key': key } })
  return {
    ...toStatus(dto),
    latitude: dto.latitude,
    longitude: dto.longitude,
    environment: dto.environment,
    deploymentStatus: dto.deployment_status,
    automationLevel: dto.automation_level,
    installationType: dto.installation_type,
    commissioningDate: dto.commissioning_date,
    evidenceUrls: dto.evidence_urls,
  }
}

/** Answers a request for changes; returns the new verification status (pending review). */
export async function updateOwnContribution(id: number, key: string, update: OwnContributionUpdate): Promise<string> {
  const response = await requestJson<{ verification_status: string }>(`contributions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Contribution-Key': key },
    // JSON.stringify drops the fields left undefined
    body: JSON.stringify({
      quantity: update.quantity,
      environment: update.environment,
      deployment_status: update.deploymentStatus,
      automation_level: update.automationLevel,
      installation_type: update.installationType,
      commissioning_date: update.commissioningDate,
      evidence_urls: update.evidenceUrls,
      change_note: update.changeNote,
      latitude: update.latitude,
      longitude: update.longitude,
      disclosure_accepted: true,
    }),
  })
  return response.verification_status
}
