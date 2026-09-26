import { query } from '../database.js'
import { deriveSiteStatus } from '../lib/site-status.js'
import type { DeploymentStatus, MineStatus, MiningEnvironment } from '../types.js'

export interface BoundingBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export interface MapFilters {
  bbox: BoundingBox | null
  country?: string
  region?: string
  commodity?: string
  supplier?: string
  machineType?: string
  automationLevel?: string
  environment?: string
  /** YYYY-MM-DD */
  date?: string
}

export interface MapSite {
  id: number
  name: string
  longitude: number
  latitude: number
  status: DeploymentStatus | null
  technologySuppliers: string[]
}

export interface MapResult {
  sites: MapSite[]
  /** Deployments excluded for lacking a commissioning date when a date is given */
  excludedCount: number
}

interface MapRow {
  site_id: number
  site_name: string
  longitude: number
  latitude: number
  status: DeploymentStatus
  technology_supplier: string | null
  excluded: boolean
  in_window: boolean
}

/**
 * Map query: site-level and deployment-level filters run in SQL; only verified deployments are returned (FR-43).
 *
 * Date semantics (FR-11 / FR-19): deployments without a commissioning date count as excluded; "in service" uses valid_from / valid_to, with a null valid_from meaning no lower bound.
 */
export async function findMapSites(filters: MapFilters): Promise<MapResult> {
  const { bbox } = filters
  const rows = await query<MapRow>(
    `
    SELECT
      s.id::int AS site_id,
      s.name AS site_name,
      ST_X(s.point_4326) AS longitude,
      ST_Y(s.point_4326) AS latitude,
      d.status::text AS status,
      sc.name AS technology_supplier,
      ($9::date IS NOT NULL AND d.commissioning_date IS NULL) AS excluded,
      (
        $9::date IS NULL
        OR (
          d.commissioning_date IS NOT NULL
          AND (d.valid_from IS NULL OR d.valid_from <= $9::date)
          AND (d.valid_to IS NULL OR d.valid_to >= $9::date)
        )
      ) AS in_window
    FROM deployment d
    JOIN site s ON s.id = d.site_id
    LEFT JOIN region r ON r.id = s.region_id
    JOIN machine_model m ON m.id = d.machine_model_id
    LEFT JOIN technology_product p ON p.id = d.technology_product_id
    LEFT JOIN company sc ON sc.id = p.supplier_id
    WHERE d.verification_status = 'verified'
      AND s.point_4326 IS NOT NULL
      AND ($1::float8 IS NULL OR s.point_4326 && ST_MakeEnvelope($1, $2, $3, $4, 4326))
      AND ($5::text IS NULL OR s.country_code = $5)
      AND ($6::text IS NULL OR r.name = $6)
      AND ($7::text IS NULL OR s.commodity = $7)
      AND ($8::text IS NULL OR sc.name = $8)
      AND ($10::text IS NULL OR m.machine_type::text = $10)
      AND ($11::text IS NULL OR p.automation_level::text = $11)
      AND ($12::text IS NULL OR d.environment::text = $12)
    ORDER BY s.id, d.id
    `,
    [
      bbox?.minLon ?? null,
      bbox?.minLat ?? null,
      bbox?.maxLon ?? null,
      bbox?.maxLat ?? null,
      filters.country ?? null,
      filters.region ?? null,
      filters.commodity ?? null,
      filters.supplier ?? null,
      filters.date ?? null,
      filters.machineType ?? null,
      filters.automationLevel ?? null,
      filters.environment ?? null,
    ],
  )

  let excludedCount = 0
  const bySite = new Map<number, { row: MapRow; deployments: Array<{ status: DeploymentStatus }>; suppliers: Set<string> }>()

  for (const row of rows) {
    if (row.excluded) excludedCount += 1
    if (!row.in_window) continue

    let entry = bySite.get(row.site_id)
    if (!entry) {
      entry = { row, deployments: [], suppliers: new Set() }
      bySite.set(row.site_id, entry)
    }
    entry.deployments.push({ status: row.status })
    if (row.technology_supplier !== null) entry.suppliers.add(row.technology_supplier)
  }

  const sites: MapSite[] = [...bySite.values()].map(({ row, deployments, suppliers }) => ({
    id: row.site_id,
    name: row.site_name,
    longitude: row.longitude,
    latitude: row.latitude,
    status: deriveSiteStatus(deployments),
    technologySuppliers: [...suppliers],
  }))

  return { sites, excludedCount }
}

export interface SiteDetail {
  id: number
  name: string
  countryCode: string
  region: string | null
  commodity: string | null
  mineStatus: MineStatus | null
  latitude: number | null
  longitude: number | null
}

export interface SiteDeployment {
  id: number
  machineManufacturer: string
  machineModel: string | null
  machineType: string
  quantity: number
  technologySupplier: string | null
  automationLevel: string | null
  environment: MiningEnvironment | null
  status: DeploymentStatus | null
  commissioningDate: string | null
  validFrom: string | null
  validTo: string | null
}

interface SiteRow {
  id: number
  name: string
  country_code: string
  region: string | null
  commodity: string | null
  mine_status: MineStatus | null
  latitude: number | null
  longitude: number | null
}

interface SiteDeploymentRow {
  id: number
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  automation_level: string | null
  environment: MiningEnvironment | null
  status: DeploymentStatus | null
  commissioning_date: string | null
  valid_from: string | null
  valid_to: string | null
}

/** Site base attributes, or null when not found */
export async function findSiteById(id: number): Promise<SiteDetail | null> {
  const rows = await query<SiteRow>(
    `
    SELECT
      s.id::int AS id,
      s.name,
      s.country_code,
      r.name AS region,
      s.commodity,
      s.mine_status::text AS mine_status,
      ST_Y(s.point_4326) AS latitude,
      ST_X(s.point_4326) AS longitude
    FROM site s
    LEFT JOIN region r ON r.id = s.region_id
    WHERE s.id = $1
    `,
    [id],
  )
  const row = rows[0]
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    countryCode: row.country_code,
    region: row.region,
    commodity: row.commodity,
    mineStatus: row.mine_status,
    latitude: row.latitude,
    longitude: row.longitude,
  }
}

/**
 * Verified deployments for a site (FR-17 / FR-43); supplier resolved via technology_product → company.
 */
export async function findVerifiedDeploymentsBySite(siteId: number): Promise<SiteDeployment[]> {
  const rows = await query<SiteDeploymentRow>(
    `
    SELECT
      d.id::int AS id,
      mc.name AS machine_manufacturer,
      m.model_name AS machine_model,
      m.machine_type::text AS machine_type,
      d.quantity,
      sc.name AS technology_supplier,
      p.automation_level::text AS automation_level,
      d.environment::text AS environment,
      d.status::text AS status,
      d.commissioning_date::text AS commissioning_date,
      d.valid_from::text AS valid_from,
      d.valid_to::text AS valid_to
    FROM deployment d
    JOIN machine_model m ON m.id = d.machine_model_id
    JOIN company mc ON mc.id = m.manufacturer_id
    LEFT JOIN technology_product p ON p.id = d.technology_product_id
    LEFT JOIN company sc ON sc.id = p.supplier_id
    WHERE d.site_id = $1
      AND d.verification_status = 'verified'
    ORDER BY d.id
    `,
    [siteId],
  )

  return rows.map((row) => ({
    id: row.id,
    machineManufacturer: row.machine_manufacturer,
    machineModel: row.machine_model,
    machineType: row.machine_type,
    quantity: row.quantity,
    technologySupplier: row.technology_supplier,
    automationLevel: row.automation_level,
    environment: row.environment,
    status: row.status,
    commissioningDate: row.commissioning_date,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  }))
}
