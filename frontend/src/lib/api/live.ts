import { getMap } from './map'
import { getSite } from './sites'
import { formatCountry, formatEnumLabel } from '../format'
import type { MapQuery, SiteDetail } from './types'
import type { MapDeployment, MapSite } from '../../features/map/types'

export interface LiveSitesResult {
  sites: MapSite[]
  excludedCount: number
}

/** English name for an ISO 3166-1 alpha-2 code; anything else is returned unchanged. */
export function countryName(countryCode: string): string {
  if (!countryCode) return countryCode
  return formatCountry(countryCode)
}

const MACHINE_TYPE_LABELS: Record<string, string> = {
  haul_truck: 'Haul truck',
  lhd: 'LHD',
  loader: 'Loader',
  dozer: 'Dozer',
  excavator: 'Excavator',
  drill: 'Drill',
  scaler: 'Scaler',
  shotcrete_machine: 'Shotcrete machine',
  other: 'Other',
}

/** Unlisted types use the same sentence case, e.g. underground_haul_truck → "Underground haul truck". */
export function machineTypeLabel(machineType: string): string {
  return MACHINE_TYPE_LABELS[machineType] ?? formatEnumLabel(machineType)
}

function environmentLabel(environment: string): MapDeployment['environment'] {
  if (environment === 'underground') return 'Underground'
  if (environment === 'both') return 'Both'
  return 'Surface'
}

function isDeploymentInQuery(
  deployment: SiteDetail['deployments'][number],
  query: MapQuery,
): boolean {
  if (query.supplier !== undefined && deployment.technologySupplier !== query.supplier) return false
  if (query.machineType !== undefined && deployment.machineType !== query.machineType) return false
  if (query.automationLevel !== undefined && deployment.automationLevel !== query.automationLevel) return false
  if (query.environment !== undefined && deployment.environment !== query.environment) return false
  if (query.date !== undefined) {
    if (deployment.validFrom !== null && deployment.validFrom > query.date) return false
    if (deployment.validTo !== null && deployment.validTo < query.date) return false
  }
  return true
}

function mapSite(detail: SiteDetail, query: MapQuery): MapSite {
  const deployments: MapDeployment[] = detail.deployments
    .filter((deployment) => isDeploymentInQuery(deployment, query))
    .map((deployment) => ({
      id: String(deployment.id),
      machineModel: deployment.machineModel ?? undefined,
      machineType: machineTypeLabel(deployment.machineType),
      manufacturer: deployment.machineManufacturer ?? 'Not recorded',
      supplier: deployment.technologySupplier,
      automationLevel: deployment.automationLevel ?? 'Not recorded',
      environment: environmentLabel(deployment.environment),
      status: deployment.status,
      quantity: deployment.quantity,
      commissioningDate: deployment.commissioningDate ?? undefined,
    }))

  return {
    id: String(detail.id),
    name: detail.name,
    region: detail.region ?? 'Region not recorded',
    country: countryName(detail.countryCode),
    latitude: detail.latitude,
    longitude: detail.longitude,
    deployments,
  }
}

/** Loads the live map index and the verified detail records behind its markers. */
export async function getLiveSites(query: MapQuery = {}): Promise<LiveSitesResult> {
  const map = await getMap(query)
  const details = await Promise.all(map.markers.map((marker) => getSite(marker.id)))

  return {
    sites: details.map((detail) => mapSite(detail, query)).filter((site) => site.deployments.length > 0),
    excludedCount: map.excludedCount,
  }
}
