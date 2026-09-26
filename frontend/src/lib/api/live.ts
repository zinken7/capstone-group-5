import { getMap } from './map'
import { getSite } from './sites'
import type { MapQuery, SiteDetail } from './types'
import type { MapDeployment, MapSite } from '../../features/map/types'

export interface LiveSitesResult {
  sites: MapSite[]
  excludedCount: number
}

const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia',
  CA: 'Canada',
  CN: 'China',
  ES: 'Spain',
  KZ: 'Kazakhstan',
  US: 'United States',
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

function machineTypeLabel(machineType: string): string {
  return MACHINE_TYPE_LABELS[machineType] ?? machineType.replaceAll('_', ' ')
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
    if (deployment.validFrom > query.date) return false
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
    country: COUNTRY_NAMES[detail.countryCode] ?? detail.countryCode,
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
