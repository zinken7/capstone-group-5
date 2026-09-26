import type { DeploymentStatus } from '../map/types'

export interface EquipmentRecord {
  id: string
  siteName: string
  country: string
  region: string
  machineModel?: string
  machineType: string
  manufacturer: string
  supplier: string
  automationLevel: string
  environment: 'Surface' | 'Underground' | 'Both'
  status: DeploymentStatus
  quantity: number
  commissioningDate?: string
}

export type EquipmentSort = 'site' | 'quantity' | 'supplier' | 'status' | 'commissioning'
export type SortDirection = 'asc' | 'desc'
