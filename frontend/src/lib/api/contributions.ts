import { requestJson } from './http'
import type {
  ContributionFormValues,
  ContributionSubmissionResult,
  ContributionVerificationStatus,
} from '../../features/contribute/types'

interface ContributionResponseDto {
  id?: number
  verification_status?: string
  verificationStatus?: string
}

interface ContributionRequestDto {
  site_name: string
  country_code: string
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
  if (value === 'unverified' || value === 'pending_review' || value === 'verified' || value === 'rejected') {
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
  }
}
