import type { machineType } from './db/schema.js'

export type DeploymentStatus = 'announced' | 'commissioning' | 'operational' | 'decommissioned'

export type VerificationStatus = 'unverified' | 'pending_review' | 'changes_requested' | 'verified' | 'rejected'

export type MiningEnvironment = 'surface' | 'underground' | 'both'

export type MineStatus = 'operating' | 'commissioning'

// The values migration 002 settled, taken from the schema so they cannot drift
export type MachineType = (typeof machineType.enumValues)[number]

export interface Deployment {
  id: number
  siteId: number
  machineManufacturer: string | null
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
