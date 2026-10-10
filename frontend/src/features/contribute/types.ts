export const MACHINE_TYPES = [
  ['haul_truck', 'Haul truck'],
  ['lhd', 'LHD'],
  ['loader', 'Loader'],
  ['dozer', 'Dozer'],
  ['excavator', 'Excavator'],
  ['drill', 'Drill'],
  ['scaler', 'Scaler'],
  ['shotcrete_machine', 'Shotcrete machine'],
  ['underground_haul_truck', 'Underground haul truck'],
  ['water_truck', 'Water truck'],
  ['wheel_loader', 'Wheel loader'],
  ['crawler_loader', 'Crawler loader'],
  ['rock_breaker', 'Rock breaker'],
  ['skid_steer', 'Skid steer'],
  ['strut_handler', 'Strut handler'],
  ['shovel', 'Shovel'],
  ['other', 'Other'],
] as const

export const DEPLOYMENT_STATUSES = [
  ['announced', 'Announced'],
  ['commissioning', 'Commissioning'],
  ['operational', 'Operational'],
  ['decommissioned', 'Decommissioned'],
] as const

export const ENVIRONMENTS = [
  ['surface', 'Surface'],
  ['underground', 'Underground'],
  ['both', 'Surface and underground'],
] as const

export const AUTOMATION_LEVELS = [
  ['operator_assistance', 'Operator assistance'],
  ['teleremote', 'Teleremote'],
  ['semi_autonomous', 'Semi-autonomous'],
  ['autonomous', 'Autonomous'],
] as const

export const INSTALLATION_TYPES = [
  ['factory_installed', 'Factory installed'],
  ['retrofit', 'Retrofit'],
  ['unknown', 'Unknown'],
] as const

/** Country codes present in the supplied market dataset, kept as controlled form values. */
export const COUNTRIES = [
  ['AU', 'Australia'],
  ['BR', 'Brazil'],
  ['CA', 'Canada'],
  ['CL', 'Chile'],
  ['FI', 'Finland'],
  ['ID', 'Indonesia'],
  ['PE', 'Peru'],
  ['SE', 'Sweden'],
  ['US', 'United States'],
  ['XR', 'Anonymised'],
  ['ZA', 'South Africa'],
] as const

export type ReferenceOption = readonly [value: string, label: string]

export interface ContributionReferenceData {
  machineTypes: readonly ReferenceOption[]
  environments: readonly ReferenceOption[]
  deploymentStatuses: readonly ReferenceOption[]
  automationLevels: readonly ReferenceOption[]
  installationTypes: readonly ReferenceOption[]
  countries?: readonly ReferenceOption[]
}

export const DEFAULT_CONTRIBUTION_REFERENCE_DATA: ContributionReferenceData = {
  machineTypes: MACHINE_TYPES,
  environments: ENVIRONMENTS,
  deploymentStatuses: DEPLOYMENT_STATUSES,
  automationLevels: AUTOMATION_LEVELS,
  installationTypes: INSTALLATION_TYPES,
  countries: COUNTRIES,
}

export interface ContributionFormValues {
  siteName: string
  countryCode: string
  latitude: string
  longitude: string
  region: string
  commodity: string
  machineType: string
  manufacturer: string
  machineModel: string
  machineModelVariant: string
  quantity: string
  environment: string
  deploymentStatus: string
  automationLevel: string
  installationType: string
  technologySupplier: string
  technologyProduct: string
  commissioningDate: string
  evidenceUrls: string[]
  email: string
  organisation: string
  disclosureAccepted: boolean
}

export type ContributionField = keyof ContributionFormValues | 'deployment'

export type ContributionErrors = Partial<Record<ContributionField, string>>

export type ContributionVerificationStatus = 'unverified' | 'pending_review' | 'verified' | 'rejected'

export interface ContributionSubmissionResult {
  /** The record id returned by the API, used as the follow-up reference. */
  id?: number
  verificationStatus: ContributionVerificationStatus
}

export type ContributionSubmitter = (values: ContributionFormValues) => Promise<ContributionSubmissionResult | void>

export const EMPTY_CONTRIBUTION_FORM: ContributionFormValues = {
  siteName: '',
  countryCode: '',
  latitude: '',
  longitude: '',
  region: '',
  commodity: '',
  machineType: '',
  manufacturer: '',
  machineModel: '',
  machineModelVariant: '',
  quantity: '',
  environment: '',
  deploymentStatus: '',
  automationLevel: '',
  installationType: '',
  technologySupplier: '',
  technologyProduct: '',
  commissioningDate: '',
  evidenceUrls: [''],
  email: '',
  organisation: '',
  disclosureAccepted: false,
}
