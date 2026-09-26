export const MACHINE_TYPES = [
  ['haul_truck', 'Haul truck'],
  ['lhd', 'LHD'],
  ['loader', 'Loader'],
  ['dozer', 'Dozer'],
  ['excavator', 'Excavator'],
  ['drill', 'Drill'],
  ['scaler', 'Scaler'],
  ['shotcrete_machine', 'Shotcrete machine'],
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
  ['both', 'Both'],
] as const

export interface ContributionFormValues {
  siteName: string
  countryCode: string
  region: string
  commodity: string
  machineType: string
  manufacturer: string
  machineModel: string
  quantity: string
  environment: string
  deploymentStatus: string
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

export type ContributionSubmitter = (values: ContributionFormValues) => Promise<void>

export const EMPTY_CONTRIBUTION_FORM: ContributionFormValues = {
  siteName: '',
  countryCode: '',
  region: '',
  commodity: '',
  machineType: '',
  manufacturer: '',
  machineModel: '',
  quantity: '',
  environment: '',
  deploymentStatus: '',
  technologySupplier: '',
  technologyProduct: '',
  commissioningDate: '',
  evidenceUrls: [''],
  email: '',
  organisation: '',
  disclosureAccepted: false,
}
