import { requestJson } from './http'
import { mapMapResponse } from './mappers'
import type { MapQuery, MapResponseDto, MapResult } from './types'

export async function getMap(query: MapQuery = {}): Promise<MapResult> {
  const params = new URLSearchParams()
  if (query.bbox !== undefined) params.set('bbox', query.bbox.join(','))

  const filters = {
    supplier: query.supplier,
    date: query.date,
    country: query.country,
    region: query.region,
    machine_type: query.machineType,
    automation_level: query.automationLevel,
    commodity: query.commodity,
    environment: query.environment,
  }
  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(name, value)
  }

  if (query.year !== undefined) params.set('year', String(query.year))
  if (query.includeDecommissioned) params.set('include_decommissioned', 'true')

  const search = params.toString()
  const dto = await requestJson<MapResponseDto>(`map${search ? `?${search}` : ''}`)
  return mapMapResponse(dto)
}
