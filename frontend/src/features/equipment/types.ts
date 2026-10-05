import type { DeploymentStatus } from '../map/types'

export interface EquipmentRecord {
  id: string
  siteId?: string
  siteName: string
  country: string
  region: string
  commodity?: string
  machineModel?: string
  modelVariant?: string
  machineType: string
  manufacturer: string
  supplier: string
  technologyProduct?: string
  automationLevel: string
  environment: 'Surface' | 'Underground' | 'Both' | 'Not recorded'
  installationType?: string
  status: DeploymentStatus | 'unknown'
  quantity: number
  commissioningDate?: string
  validFrom?: string
  validTo?: string
}

export type EquipmentSort = 'site' | 'country' | 'manufacturer' | 'machine_type' | 'quantity' | 'supplier' | 'status' | 'commissioning'
export type SortDirection = 'asc' | 'desc'
