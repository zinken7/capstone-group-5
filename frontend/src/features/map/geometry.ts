import type { MapMarker, SiteDeployment } from '../../lib/api/types'

/** Marker area grows with the machines in service (square-root scale), with a floor that stays easy to click. */
export function markerRadius(machines: number): number {
  return Math.max(5, Math.sqrt(Math.max(machines, 0)) * 1.45)
}

/** [[south, west], [north, east]] around every marker, or null when there are none. */
export function boundsOf(markers: readonly Pick<MapMarker, 'latitude' | 'longitude'>[]): [[number, number], [number, number]] | null {
  if (markers.length === 0) return null
  const latitudes = markers.map((marker) => marker.latitude)
  const longitudes = markers.map((marker) => marker.longitude)
  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ]
}

/** The commissioning year, or the year of the commissioning date; null when neither is known. */
export function startYearOf(deployment: Pick<SiteDeployment, 'commissioningYear' | 'commissioningDate'>): number | null {
  if (deployment.commissioningYear !== null) return deployment.commissioningYear
  return deployment.commissioningDate ? Number(deployment.commissioningDate.slice(0, 4)) : null
}

type TimedDeployment = Pick<SiteDeployment, 'status' | 'commissioningYear' | 'commissioningDate' | 'validFrom' | 'validTo'>

/**
 * In service on 31 December of the year, by the rule /api/map?year= and the
 * analytics timeline use: not announced, commissioned by then, and inside its
 * validity window.
 */
export function inServiceAt(deployment: TimedDeployment, year: number): boolean {
  const day = `${year}-12-31`
  const start = startYearOf(deployment)
  return deployment.status !== 'announced'
    && start !== null && start <= year
    && (!deployment.validFrom || deployment.validFrom <= day)
    && (!deployment.validTo || deployment.validTo >= day)
}

/** Commissioned by the year but closed before its last day: what include_decommissioned adds back. Announced deployments never ran, so never ended. */
export function endedBy(deployment: TimedDeployment, year: number): boolean {
  const start = startYearOf(deployment)
  return deployment.status !== 'announced'
    && start !== null && start <= year && Boolean(deployment.validTo) && (deployment.validTo ?? '') < `${year}-12-31`
}
