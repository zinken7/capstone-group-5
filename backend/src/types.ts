// Enum labels mirror migrations/001_initial_schema.sql exactly. They are
// defined once here, as runtime arrays with derived types, so that the API
// and the seed loader's zod schemas (src/seed/schemas.ts) cannot disagree.

export const DEPLOYMENT_STATUSES = ['announced', 'commissioning', 'operational', 'decommissioned'] as const
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number]

export const VERIFICATION_STATUSES = ['unverified', 'pending_review', 'verified', 'rejected'] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const MINING_ENVIRONMENTS = ['surface', 'underground', 'both'] as const
export type MiningEnvironment = (typeof MINING_ENVIRONMENTS)[number]

export const MINE_STATUSES = ['operating', 'commissioning'] as const
export type MineStatus = (typeof MINE_STATUSES)[number]

export const MACHINE_TYPES = [
  'haul_truck',
  'lhd',
  'loader',
  'dozer',
  'excavator',
  'drill',
  'scaler',
  'shotcrete_machine',
  'other',
] as const
export type MachineType = (typeof MACHINE_TYPES)[number]

export const AUTOMATION_LEVELS = ['line_of_sight_remote', 'teleremote', 'semi_autonomous', 'autonomous'] as const
export type AutomationLevel = (typeof AUTOMATION_LEVELS)[number]

export const COMPANY_ROLES = ['owner', 'operator', 'contractor'] as const
export type CompanyRole = (typeof COMPANY_ROLES)[number]

export interface Site {
  id: number
  name: string
  countryCode: string
  region: string | null
  commodity: string
  mineStatus: MineStatus
  latitude: number
  longitude: number
}

export interface Deployment {
  id: number
  siteId: number
  machineModel: string | null
  machineType: MachineType
  quantity: number
  technologySupplier: string
  environment: MiningEnvironment
  automationLevel: AutomationLevel | null
  status: DeploymentStatus
  verificationStatus: VerificationStatus
  commissioningDate: string | null
  /** FR-11: the period during which this record is the current one, used to reconstruct past-date views. */
  validFrom: string
  validTo: string | null
}
