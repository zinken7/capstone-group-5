import { requestJson } from './http'
import type { RegisterFilters } from './register'

export interface AnalyticsSummary {
  machineCount: number
  siteCount: number
  countryCount: number
}

export interface AnalyticsBreakdownItem {
  key: string | null
  machineCount: number
  share: number
}

export interface AnalyticsBreakdowns {
  machineCount: number
  byCountry: AnalyticsBreakdownItem[]
  byMachineType: AnalyticsBreakdownItem[]
  byManufacturer: AnalyticsBreakdownItem[]
  bySupplier: AnalyticsBreakdownItem[]
  byAutomationLevel: AnalyticsBreakdownItem[]
  byStatus: AnalyticsBreakdownItem[]
}

function queryString(filters: RegisterFilters): string {
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
    const value = filters[field]
    if (value) params.set(key, value)
  }
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

interface AnalyticsSummaryDto {
  machine_count: number
  site_count: number
  country_count: number
}

interface AnalyticsBreakdownItemDto {
  key: string | null
  machine_count: number
  share: number
}

interface AnalyticsBreakdownsDto {
  machine_count: number
  by_country: AnalyticsBreakdownItemDto[]
  by_machine_type: AnalyticsBreakdownItemDto[]
  by_manufacturer: AnalyticsBreakdownItemDto[]
  by_supplier: AnalyticsBreakdownItemDto[]
  by_automation_level: AnalyticsBreakdownItemDto[]
  by_status: AnalyticsBreakdownItemDto[]
}

export async function getAnalyticsSummary(filters: RegisterFilters = {}): Promise<AnalyticsSummary> {
  const response = await requestJson<AnalyticsSummaryDto>(`analytics/summary${queryString(filters)}`)
  return {
    machineCount: response.machine_count,
    siteCount: response.site_count,
    countryCount: response.country_count,
  }
}

export async function getAnalyticsBreakdowns(filters: RegisterFilters = {}): Promise<AnalyticsBreakdowns> {
  const response = await requestJson<AnalyticsBreakdownsDto>(`analytics/breakdowns${queryString(filters)}`)
  const map = (items: AnalyticsBreakdownItemDto[]) => items.map((item) => ({
    key: item.key,
    machineCount: item.machine_count,
    share: item.share,
  }))
  return {
    machineCount: response.machine_count,
    byCountry: map(response.by_country),
    byMachineType: map(response.by_machine_type),
    byManufacturer: map(response.by_manufacturer),
    bySupplier: map(response.by_supplier),
    byAutomationLevel: map(response.by_automation_level),
    byStatus: map(response.by_status),
  }
}
