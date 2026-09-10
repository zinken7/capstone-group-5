export type DeploymentStatus = 'announced' | 'commissioning' | 'operational' | 'decommissioned'

export type VerificationStatus = 'unverified' | 'pending_review' | 'verified' | 'rejected'

export type MiningEnvironment = 'surface' | 'underground' | 'both'

export type MineStatus = 'operating' | 'commissioning'

export type MachineType =
  | 'haul_truck'
  | 'lhd'
  | 'dozer'
  | 'excavator'
  | 'drill'
  | 'scaler'
  | 'shotcrete_machine'
  | 'other'

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
  automationLevel: string | null
  status: DeploymentStatus
  verificationStatus: VerificationStatus
  commissioningDate: string | null
  /** FR-11: the period during which this record is the current one, used to reconstruct past-date views. */
  validFrom: string
  validTo: string | null
}
