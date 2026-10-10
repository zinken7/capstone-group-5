import { and, asc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '../database.js'
import * as tables from '../db/schema.js'
import { deriveSiteStatus } from '../lib/site-status.js'
import type { DeploymentStatus, MineStatus, MiningEnvironment } from '../types.js'

// company joins twice: once as the machine manufacturer, once as the technology supplier
const manufacturer = alias(tables.company, 'manufacturer')
const supplier = alias(tables.company, 'supplier')

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
  /** In service on 31 December of this year, by the same rule as the analytics timeline (#109) */
  year?: number
  /** With a date or year, also keep sites whose deployments had ended by then, as decommissioned */
  includeDecommissioned?: boolean
}

export interface MapSite {
  id: number
  name: string
  longitude: number
  latitude: number
  countryCode: string
  region: string | null
  commodity: string | null
  status: DeploymentStatus | null
  technologySuppliers: string[]
  /** Machines and deployments in the map's view: in service at the date or year when one is given */
  machineCount: number
  deploymentCount: number
}

export interface MapResult {
  sites: MapSite[]
  /** Deployments excluded for lacking a commissioning date (or, by year, a commissioning year) */
  excludedCount: number
}

type MapRow = {
  site_id: number
  site_name: string
  longitude: number
  latitude: number
  country_code: string
  region: string | null
  commodity: string | null
  status: DeploymentStatus
  quantity: number
  technology_supplier: string | null
  excluded: boolean
  in_window: boolean
  ended: boolean
}

/**
 * Map query: site-level and deployment-level filters run in SQL; only verified deployments are returned (FR-43).
 *
 * Date semantics (FR-11 / FR-19): deployments without a commissioning date count as excluded; "in service" uses valid_from / valid_to, with a null valid_from meaning no lower bound.
 *
 * Year semantics match the analytics timeline, so the map and the in-service
 * curve agree: on 31 December of the year, a deployment is in service when it
 * is not announced, its commissioning year (or the year of its date) is no
 * later, and the day falls inside valid_from..valid_to. A deployment with no
 * commissioning year is excluded.
 *
 * A deployment that had ended by the reference day (valid_to before it) is
 * left out unless includeDecommissioned is set; then its site is kept, and a
 * site with nothing else in service shows as decommissioned. Ended
 * deployments never count towards machineCount.
 *
 * Stays as parameterised SQL through Drizzle (#71): the && bounding-box
 * operator, ST_MakeEnvelope and the exclusion/window flags have no clearer
 * query-builder form.
 */
export async function findMapSites(filters: MapFilters): Promise<MapResult> {
  const { bbox } = filters
  const date = filters.date ?? null
  const year = filters.year ?? null
  const result = await db.execute<MapRow>(sql`
    WITH reference AS (
      SELECT
        COALESCE(${date}::date, make_date(${year}::int, 12, 31)) AS day,
        ${year}::int IS NOT NULL AS by_year
    ),
    candidate AS (
      SELECT
        d.*,
        COALESCE(d.commissioning_year::int, EXTRACT(YEAR FROM d.commissioning_date)::int) AS start_year
      FROM deployment d
    )
    SELECT
      s.id::int AS site_id,
      s.name AS site_name,
      ST_X(s.point_4326) AS longitude,
      ST_Y(s.point_4326) AS latitude,
      s.country_code,
      r.name AS region,
      s.commodity,
      d.status::text AS status,
      d.quantity,
      sc.name AS technology_supplier,
      (
        CASE
          WHEN ref.day IS NULL THEN FALSE
          WHEN ref.by_year THEN d.status IS DISTINCT FROM 'announced' AND d.start_year IS NULL
          ELSE d.commissioning_date IS NULL
        END
      ) AS excluded,
      (
        CASE
          WHEN ref.day IS NULL THEN TRUE
          WHEN ref.by_year THEN d.status IS DISTINCT FROM 'announced' AND d.start_year <= ${year}::int
          ELSE d.commissioning_date IS NOT NULL
        END
        AND (ref.day IS NULL OR d.valid_from IS NULL OR d.valid_from <= ref.day)
        AND (ref.day IS NULL OR d.valid_to IS NULL OR d.valid_to >= ref.day)
      ) AS in_window,
      COALESCE(
        ${filters.includeDecommissioned ?? false}::boolean
        -- Announced deployments never ran, so they cannot have ended either
        AND d.status IS DISTINCT FROM 'announced'
        AND d.valid_to < ref.day
        AND CASE WHEN ref.by_year THEN d.start_year <= ${year}::int ELSE d.commissioning_date IS NOT NULL END,
        FALSE
      ) AS ended
    FROM candidate d
    CROSS JOIN reference ref
    JOIN site s ON s.id = d.site_id
    LEFT JOIN region r ON r.id = s.region_id
    JOIN machine_model m ON m.id = d.machine_model_id
    LEFT JOIN technology_product p ON p.id = d.technology_product_id
    LEFT JOIN company sc ON sc.id = p.supplier_id
    WHERE d.verification_status = 'verified'
      AND s.point_4326 IS NOT NULL
      AND (${bbox?.minLon ?? null}::float8 IS NULL OR s.point_4326 && ST_MakeEnvelope(${bbox?.minLon ?? null}, ${bbox?.minLat ?? null}, ${bbox?.maxLon ?? null}, ${bbox?.maxLat ?? null}, 4326))
      AND (${filters.country ?? null}::text IS NULL OR s.country_code = ${filters.country ?? null})
      AND (${filters.region ?? null}::text IS NULL OR r.name = ${filters.region ?? null})
      AND (${filters.commodity ?? null}::text IS NULL OR s.commodity = ${filters.commodity ?? null})
      AND (${filters.supplier ?? null}::text IS NULL OR sc.name = ${filters.supplier ?? null})
      AND (${filters.machineType ?? null}::text IS NULL OR m.machine_type::text = ${filters.machineType ?? null})
      AND (${filters.automationLevel ?? null}::text IS NULL OR COALESCE(d.automation_level, p.automation_level)::text = ${filters.automationLevel ?? null})
      AND (${filters.environment ?? null}::text IS NULL OR d.environment::text = ${filters.environment ?? null})
    ORDER BY s.id, d.id
  `)
  const rows = result.rows

  let excludedCount = 0
  type SiteEntry = { row: MapRow; deployments: Array<{ status: DeploymentStatus }>; ended: boolean; suppliers: Set<string>; machines: number }
  const bySite = new Map<number, SiteEntry>()

  for (const row of rows) {
    if (row.excluded) excludedCount += 1
    // FR-16: only operational deployments appear by default.
    // Decommissioned deployments require the explicit checkbox.
    if (row.status !== 'operational' &&
        !(filters.includeDecommissioned && row.status === 'decommissioned')) {
      continue
    }

    if (!row.in_window && !row.ended) continue

    let entry = bySite.get(row.site_id)
    if (!entry) {
      entry = { row, deployments: [], ended: false, suppliers: new Set(), machines: 0 }
      bySite.set(row.site_id, entry)
    }
    if (row.technology_supplier !== null) entry.suppliers.add(row.technology_supplier)
    if (row.ended) {
      entry.ended = true
      continue
    }
    entry.deployments.push({ status: row.status })
    entry.machines += row.quantity
  }

  const sites: MapSite[] = [...bySite.values()].map(({ row, deployments, ended, suppliers, machines }) => ({
    id: row.site_id,
    name: row.site_name,
    longitude: row.longitude,
    latitude: row.latitude,
    countryCode: row.country_code,
    region: row.region,
    commodity: row.commodity,
    // A site kept only for deployments that had ended reads as decommissioned
    status: deriveSiteStatus(deployments) ?? (ended ? 'decommissioned' : null),
    technologySuppliers: [...suppliers],
    machineCount: machines,
    deploymentCount: deployments.length,
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
  commissioningYear: number | null
  validFrom: string | null
  validTo: string | null
}

/** Site base attributes, or null when not found */
export async function findSiteById(id: number): Promise<SiteDetail | null> {
  const rows = await db
    .select({
      id: tables.site.id,
      name: tables.site.name,
      countryCode: tables.site.countryCode,
      region: tables.region.name,
      commodity: tables.site.commodity,
      mineStatus: tables.site.mineStatus,
      // Geometry is only read through its PostGIS accessors
      latitude: sql<number | null>`ST_Y(${tables.site.point4326})`,
      longitude: sql<number | null>`ST_X(${tables.site.point4326})`,
    })
    .from(tables.site)
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .where(eq(tables.site.id, id))
  return rows[0] ?? null
}

/**
 * Verified deployments for a site (FR-17 / FR-43); supplier resolved via technology_product → company.
 */
export async function findVerifiedDeploymentsBySite(siteId: number): Promise<SiteDeployment[]> {
  return await db
    .select({
      id: tables.deployment.id,
      machineManufacturer: manufacturer.name,
      machineModel: tables.machineModel.modelName,
      machineType: tables.machineModel.machineType,
      quantity: tables.deployment.quantity,
      technologySupplier: supplier.name,
      // The deployment's own level wins; the product level is the fallback
      automationLevel: sql<string | null>`COALESCE(${tables.deployment.automationLevel}, ${tables.technologyProduct.automationLevel})::text`,
      environment: tables.deployment.environment,
      status: tables.deployment.status,
      commissioningDate: tables.deployment.commissioningDate,
      commissioningYear: tables.deployment.commissioningYear,
      validFrom: tables.deployment.validFrom,
      validTo: tables.deployment.validTo,
    })
    .from(tables.deployment)
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.technologyProduct.supplierId))
    .where(and(eq(tables.deployment.siteId, siteId), eq(tables.deployment.verificationStatus, 'verified')))
    .orderBy(asc(tables.deployment.id))
}
