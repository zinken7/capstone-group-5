import type { MapSite } from '../map/types'
import type { EquipmentRecord } from './types'

export function buildEquipmentRecords(sites: MapSite[]): EquipmentRecord[] {
  return sites.flatMap((site) =>
    site.deployments.map((deployment) => ({
      ...deployment,
      siteName: site.name,
      country: site.country,
      region: site.region,
    })),
  )
}
