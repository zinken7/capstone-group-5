import { requestJson } from './http'
import { getApiBaseUrl } from './config'
import { ApiError } from './errors'
import type { DeploymentStatus } from '../../features/map/types'
import type { EquipmentRecord, EquipmentSort, SortDirection } from '../../features/equipment/types'

export interface RegisterItemDto {
  id: number
  site_id?: number
  site_name: string
  country_code: string
  region: string | null
  commodity?: string | null
  machine_manufacturer: string | null
  machine_model: string | null
  model_variant?: string | null
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

export interface RegisterFilters {
  q?: string
  siteId?: string
  country?: string
  region?: string
  commodity?: string
  supplier?: string
  manufacturer?: string
  machineType?: string
  automationLevel?: string
  environment?: string
  status?: string
}

export interface RegisterQuery extends RegisterFilters {
  sort?: EquipmentSort
  order?: SortDirection
  limit?: number
  offset?: number
}

export interface RegisterPage {
  records: EquipmentRecord[]
  total: number
  limit: number
  offset: number
}

export function toEquipmentRecord(item: RegisterItemDto): EquipmentRecord {
  const record: EquipmentRecord = {
    id: String(item.id),
    siteName: item.site_name || 'Not recorded',
    country: item.country_code || 'Not recorded',
    region: item.region ?? 'Not recorded',
    machineModel: item.machine_model ?? undefined,
    machineType: item.machine_type,
    manufacturer: item.machine_manufacturer ?? 'Not recorded',
    supplier: item.technology_supplier ?? 'Not recorded',
    automationLevel: item.automation_level ?? '',
    environment: item.environment ?? '',
    status: item.status ?? 'unknown',
    quantity: item.quantity,
    commissioningDate: item.commissioning_date ?? (item.commissioning_year === null ? undefined : String(item.commissioning_year)),
  }
  // The live register contract includes these fields. Keep the mapper tolerant
  // of older fixtures and cached responses used by the original page tests.
  if (item.site_id !== undefined) {
    record.siteId = String(item.site_id)
    record.commodity = item.commodity ?? undefined
    record.modelVariant = item.model_variant ?? undefined
    record.technologyProduct = item.technology_product ?? undefined
    record.installationType = item.installation_type ?? undefined
    record.validFrom = item.valid_from ?? undefined
    record.validTo = item.valid_to ?? undefined
  }
  return record
}

function queryString(query: RegisterQuery): string {
  const params = new URLSearchParams()
  const values: Array<[keyof RegisterFilters, string]> = [
    ['q', 'q'],
    ['siteId', 'site_id'],
    ['country', 'country'],
    ['region', 'region'],
    ['commodity', 'commodity'],
    ['supplier', 'supplier'],
    ['manufacturer', 'manufacturer'],
    ['machineType', 'machine_type'],
    ['automationLevel', 'automation_level'],
    ['environment', 'environment'],
    ['status', 'status'],
  ]
  for (const [field, key] of values) {
    const value = query[field]
    if (value) params.set(key, value)
  }
  if (query.sort) params.set('sort', query.sort)
  if (query.order) params.set('order', query.order)
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  if (query.offset !== undefined) params.set('offset', String(query.offset))
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

export async function getRegisterPage(query: RegisterQuery = {}): Promise<RegisterPage> {
  const response = await requestJson<RegisterResponseDto>(`register${queryString(query)}`)
  return {
    records: response.items.map(toEquipmentRecord),
    total: response.total,
    limit: response.limit,
    offset: response.offset,
  }
}

/** Load every matching row by following the API's bounded pages. */
export async function getRegisterAll(query: RegisterQuery = {}): Promise<EquipmentRecord[]> {
  const pageSize = query.limit ?? 500
  const records: EquipmentRecord[] = []
  let offset = query.offset ?? 0
  let total = Number.POSITIVE_INFINITY
  let firstRequest = true

  while (offset < total) {
    const page = await getRegisterPage({ ...query, limit: pageSize, ...(firstRequest && query.offset === undefined ? {} : { offset }) })
    firstRequest = false
    records.push(...page.records)
    total = page.total
    const nextOffset = page.offset + page.records.length
    if (page.records.length === 0 || nextOffset <= offset) break
    offset = nextOffset
  }

  return records
}

export async function getRegisterExport(query: RegisterQuery = {}): Promise<Blob> {
  const { sort, order, ...filters } = query
  const url = `${getApiBaseUrl()}/register/export${queryString({ ...filters, sort, order })}`
  let response: Response
  try {
    response = await fetch(url, { headers: { Accept: 'text/csv' } })
  } catch (cause) {
    throw new ApiError('Unable to reach the API', undefined, { cause })
  }
  if (!response.ok) throw new ApiError(`API request failed (${response.status})`, response.status)
  return response.blob()
}

/** Load every matching verified register row so incomplete records are not lost in site-detail data. */
export async function getRegister(): Promise<EquipmentRecord[]> {
  return getRegisterAll({ limit: 500 })
}
