import type { MapMarker, SiteDeployment } from '../../lib/api/types'

/** Marker area grows with the machines in service (square-root scale), with a floor that stays easy to click. */
export function markerRadius(machines: number): number {
  return Math.max(5, Math.sqrt(Math.max(machines, 0)) * 1.45)
}

export interface FitPadding {
  paddingTopLeft: [number, number]
  paddingBottomRight: [number, number]
}

const MOBILE_MAP_STAGE_MIN_HEIGHT = 36 * 16
const MOBILE_MAP_SHEET_RATIO = 0.42
const MOBILE_MAP_SHEET_MAX_HEIGHT = 18 * 16
const MOBILE_MAP_STAGE_RESERVED_HEIGHT = 10 * 16
const MOBILE_MAP_OVERLAY_GAP = 8

export interface SelectedMapOverlayGeometry {
  stageHeight: number
  sheetHeight: number
  sheetTop: number
  yearHeight: number
  yearTop: number
  yearBottom: number
}

/**
 * Shared geometry for the selected-site mobile overlays. Keep this in sync
 * with the CSS values so map panning reserves the same space that the sheet
 * and year control occupy on screen.
 */
export function selectedMapOverlayGeometry(size: { x: number; y: number }): SelectedMapOverlayGeometry {
  const stageHeight = Math.max(MOBILE_MAP_STAGE_MIN_HEIGHT, size.y)
  const sheetHeight = Math.min(
    Math.round(stageHeight * MOBILE_MAP_SHEET_RATIO),
    MOBILE_MAP_SHEET_MAX_HEIGHT,
    Math.max(0, stageHeight - MOBILE_MAP_STAGE_RESERVED_HEIGHT),
  )
  const yearHeight = Math.min(88, Math.max(72, Math.round(stageHeight * 0.14)))
  const sheetTop = stageHeight - sheetHeight - MOBILE_MAP_OVERLAY_GAP
  const yearBottom = sheetHeight + MOBILE_MAP_OVERLAY_GAP * 2
  const yearTop = stageHeight - yearBottom - yearHeight
  return { stageHeight, sheetHeight, sheetTop, yearHeight, yearTop, yearBottom }
}

/**
 * Padding for the selected-site mobile state. The bottom sheet and compact
 * year control are overlays on the map, so the selected marker must be kept
 * inside the remaining strip above them rather than merely centred.
 */
export function selectedMapPaddingForSize(size: { x: number; y: number }): FitPadding {
  const horizontal = Math.max(16, Math.round(size.x * 0.04))
  const geometry = selectedMapOverlayGeometry(size)
  const top = Math.max(72, Math.round(Math.min(geometry.stageHeight * 0.18, 112)))
  const bottom = geometry.yearBottom + geometry.yearHeight + 16
  return { paddingTopLeft: [horizontal, top], paddingBottomRight: [horizontal, bottom] }
}

/**
 * CircleMarker radii are screen pixels, so the data scale stays identical on
 * every device. Only the fit padding changes to reserve room for mobile
 * overlays and keep the visible map area useful.
 */
export function fitPaddingForSize(size: { x: number; y: number }): FitPadding {
  if (size.x <= 900) {
    const horizontal = Math.max(24, Math.round(size.x * 0.06))
    const top = Math.max(72, Math.round(Math.min(size.y * 0.18, 112)))
    const bottom = Math.max(120, Math.round(Math.min(size.y * 0.3, 192)))
    return { paddingTopLeft: [horizontal, top], paddingBottomRight: [horizontal, bottom] }
  }

  return { paddingTopLeft: [48, 96], paddingBottomRight: [48, 160] }
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
 * map use: operational or historically decommissioned, commissioned by then, and inside its
 * validity window.
 */
export function inServiceAt(deployment: TimedDeployment, year: number): boolean {
  const day = `${year}-12-31`
  const start = startYearOf(deployment)
  return deployment.status !== 'announced' && deployment.status !== 'commissioning'
    && start !== null && start <= year
    && (!deployment.validFrom || deployment.validFrom <= day)
    && (!deployment.validTo || deployment.validTo >= day)
}

/** Commissioned by the year but closed before its last day: what include_decommissioned adds back. Announced and commissioning deployments are excluded. */
export function endedBy(deployment: TimedDeployment, year: number): boolean {
  const start = startYearOf(deployment)
  return deployment.status !== 'announced' && deployment.status !== 'commissioning'
    && start !== null && start <= year && Boolean(deployment.validTo) && (deployment.validTo ?? '') < `${year}-12-31`
}
