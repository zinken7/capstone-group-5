import { requestJson } from './http'

export interface AnalyticsFilters {
  q?: string
  siteId?: string
  country?: string
  region?: string
  commodity?: string
  machineType?: string
  supplier?: string
  manufacturer?: string
  automationLevel?: string
  environment?: string
  status?: string
}

export interface AnalyticsSummaryDto {
  machine_count: number
  site_count: number
  country_count: number
}

export interface AnalyticsBreakdownItemDto {
  key: string | null
  machine_count: number
  share: number
}

export interface AnalyticsBreakdownsDto {
  machine_count: number
  by_country: AnalyticsBreakdownItemDto[]
  by_machine_type: AnalyticsBreakdownItemDto[]
  by_manufacturer: AnalyticsBreakdownItemDto[]
  by_supplier: AnalyticsBreakdownItemDto[]
  by_automation_level: AnalyticsBreakdownItemDto[]
  by_status: AnalyticsBreakdownItemDto[]
}

export interface AnalyticsTimelineYearDto {
  year: number
  newly_commissioned: number
  in_service: number
}

export interface AnalyticsTimelineDto {
  excluded_count: number
  excluded_machine_count: number
  years: AnalyticsTimelineYearDto[]
}

function queryString(filters: AnalyticsFilters): string {
  const params = new URLSearchParams()
  const entries: Array<[keyof AnalyticsFilters, string]> = [
    ['q', 'q'],
    ['siteId', 'site_id'],
    ['country', 'country'],
    ['region', 'region'],
    ['commodity', 'commodity'],
    ['machineType', 'machine_type'],
    ['supplier', 'supplier'],
    ['manufacturer', 'manufacturer'],
    ['automationLevel', 'automation_level'],
    ['environment', 'environment'],
    ['status', 'status'],
  ]
  for (const [field, key] of entries) {
    const value = filters[field]
    if (value) params.set(key, value)
  }
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

export function getAnalyticsSummary(filters: AnalyticsFilters = {}): Promise<AnalyticsSummaryDto> {
  return requestJson<AnalyticsSummaryDto>(`analytics/summary${queryString(filters)}`)
}

export function getAnalyticsBreakdowns(filters: AnalyticsFilters = {}): Promise<AnalyticsBreakdownsDto> {
  return requestJson<AnalyticsBreakdownsDto>(`analytics/breakdowns${queryString(filters)}`)
}

export function getAnalyticsTimeline(filters: AnalyticsFilters = {}): Promise<AnalyticsTimelineDto> {
  return requestJson<AnalyticsTimelineDto>(`analytics/timeline${queryString(filters)}`)
}
