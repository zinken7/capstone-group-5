import { requestJson } from './http'
import type { DeploymentStatus } from '../../features/map/types'
import type { EquipmentRecord } from '../../features/equipment/types'

interface RegisterItemDto {
  id: number
  site_name: string
  country_code: string
  region: string | null
  machine_manufacturer: string | null
  machine_model: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  automation_level: string | null
  environment: string | null
  installation_type: string | null
  status: DeploymentStatus | null
  commissioning_date: string | null
  commissioning_year: number | null
  valid_from: string | null
  valid_to: string | null
}

interface RegisterResponseDto {
  total: number
  limit: number
  offset: number
  items: RegisterItemDto[]
}

function displayLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : word)
    .join(' ')
}

function environmentLabel(value: string | null): EquipmentRecord['environment'] {
  if (value === 'surface') return 'Surface'
  if (value === 'underground') return 'Underground'
  if (value === 'both') return 'Both'
  return 'Not recorded'
}

function toEquipmentRecord(item: RegisterItemDto): EquipmentRecord {
  return {
    id: String(item.id),
    siteName: item.site_name || 'Not recorded',
    country: item.country_code || 'Not recorded',
    region: item.region ?? 'Not recorded',
    machineModel: item.machine_model ?? undefined,
    machineType: displayLabel(item.machine_type),
    manufacturer: item.machine_manufacturer ?? 'Not recorded',
    supplier: item.technology_supplier ?? 'Not recorded',
    automationLevel: item.automation_level === null ? 'Not recorded' : displayLabel(item.automation_level),
    environment: environmentLabel(item.environment),
    status: item.status ?? 'unknown',
    quantity: item.quantity,
    commissioningDate: item.commissioning_date ?? (item.commissioning_year === null ? undefined : String(item.commissioning_year)),
  }
}

/** Load every matching verified register row so incomplete records are not lost in site-detail data. */
export async function getRegister(): Promise<EquipmentRecord[]> {
  const response = await requestJson<RegisterResponseDto>('register?limit=500')
  return response.items.map(toEquipmentRecord)
}
