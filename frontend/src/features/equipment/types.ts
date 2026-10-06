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
  /** Raw API enum; formatEnumLabel is applied by the table/dialog views. */
  environment: string
  installationType?: string
  status: DeploymentStatus | 'unknown'
  quantity: number
  commissioningDate?: string
  validFrom?: string
  validTo?: string
}

export type EquipmentSort = 'site' | 'country' | 'manufacturer' | 'machine_type' | 'quantity' | 'supplier' | 'status' | 'commissioning'
export type SortDirection = 'asc' | 'desc'
