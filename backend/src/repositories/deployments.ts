import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '../database.js'
import * as tables from '../db/schema.js'
import type { DeploymentFilters } from '../lib/deployment-filters.js'

// company joins twice: once as the machine manufacturer, once as the technology supplier
export const manufacturer = alias(tables.company, 'manufacturer')
export const supplier = alias(tables.company, 'supplier')

/** The deployment's own level wins; the product level is the fallback. */
export const effectiveAutomationLevel = sql<string | null>`COALESCE(${tables.deployment.automationLevel}, ${tables.technologyProduct.automationLevel})::text`

export const REGISTER_SORTS = {
  site: tables.site.name,
  country: tables.site.countryCode,
  manufacturer: manufacturer.name,
  machine_type: sql`${tables.machineModel.machineType}::text`,
  supplier: supplier.name,
  status: sql`${tables.deployment.status}::text`,
  quantity: tables.deployment.quantity,
  commissioning: sql`COALESCE(${tables.deployment.commissioningDate}, make_date(${tables.deployment.commissioningYear}, 1, 1))`,
} as const

export type RegisterSort = keyof typeof REGISTER_SORTS
export type SortOrder = 'asc' | 'desc'

export interface RegisterQuery {
  sort: RegisterSort
  order: SortOrder
  /** Omitted for the full export */
  page?: { limit: number; offset: number }
}

export interface RegisterRow {
  id: number
  siteId: number
  siteName: string
  countryCode: string
  region: string | null
  commodity: string | null
  machineManufacturer: string
  machineModel: string | null
  modelVariant: string | null
  machineType: string
  quantity: number
  technologySupplier: string | null
  technologyProduct: string | null
  automationLevel: string | null
  environment: string | null
  installationType: string
  status: string | null
  commissioningDate: string | null
  commissioningYear: number | null
  validFrom: string | null
  validTo: string | null
}

export interface DeploymentSummary {
  machineCount: number
  siteCount: number
  countryCount: number
}

// The join chain repeats in each query below: Drizzle cannot type a shared
// join helper over a caller-chosen selection, so the shared semantics live in
// buildWhere and the register/count/summary tests pin the three together.

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
/** A contains-match ILIKE pattern with the user's %, _ and \ taken literally. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
}

/** Builds the WHERE condition; values bind as parameters, never into the SQL text (NFR-05). */
/** The commissioning year, from the year column or else the commissioning date; null when neither is recorded */
export const commissioningYear = sql<number | null>`COALESCE(${tables.deployment.commissioningYear}::int, EXTRACT(YEAR FROM ${tables.deployment.commissioningDate})::int)`

export function buildWhere(filters: DeploymentFilters): SQL | undefined {
  const conditions: SQL[] = [eq(tables.deployment.verificationStatus, 'verified')]

  if (filters.q !== undefined) {
    const pattern = likePattern(filters.q)
    const search = or(
      ilike(tables.site.name, pattern),
      ilike(tables.machineModel.modelName, pattern),
      ilike(manufacturer.name, pattern),
      ilike(supplier.name, pattern),
      ilike(tables.technologyProduct.productName, pattern),
    )
    if (search) conditions.push(search)
  }
  if (filters.siteId !== undefined) conditions.push(eq(tables.site.id, filters.siteId))
  if (filters.country !== undefined) conditions.push(eq(tables.site.countryCode, filters.country))
  if (filters.region !== undefined) conditions.push(eq(tables.region.name, filters.region))
  if (filters.commodity !== undefined) conditions.push(eq(tables.site.commodity, filters.commodity))
  if (filters.supplier !== undefined) conditions.push(eq(supplier.name, filters.supplier))
  if (filters.manufacturer !== undefined) conditions.push(eq(manufacturer.name, filters.manufacturer))
  // Enum columns compare as text so an unknown value matches nothing instead of erroring
  if (filters.machineType !== undefined) {
    conditions.push(sql`${tables.machineModel.machineType}::text = ${filters.machineType}`)
  }
  if (filters.automationLevel !== undefined) {
    conditions.push(sql`${effectiveAutomationLevel} = ${filters.automationLevel}`)
  }
  if (filters.environment !== undefined) {
    conditions.push(sql`${tables.deployment.environment}::text = ${filters.environment}`)
  }
  if (filters.status !== undefined) {
    conditions.push(sql`${tables.deployment.status}::text = ${filters.status}`)
  }
  if (filters.commissionedFrom !== undefined) conditions.push(sql`${commissioningYear} >= ${filters.commissionedFrom}`)
  if (filters.commissionedTo !== undefined) conditions.push(sql`${commissioningYear} <= ${filters.commissionedTo}`)

  return and(...conditions)
}

/** Flattened verified deployments for the equipment register (FR-36) and export (FR-37). */
export async function findRegisterRows(filters: DeploymentFilters, options: RegisterQuery): Promise<RegisterRow[]> {
  // Sort column comes from the REGISTER_SORTS whitelist, not from user input
  const direction = options.order === 'desc' ? sql`DESC` : sql`ASC`

  let query = db.select({
    id: tables.deployment.id,
    siteId: tables.site.id,
    siteName: tables.site.name,
    countryCode: tables.site.countryCode,
    region: tables.region.name,
    commodity: tables.site.commodity,
    machineManufacturer: manufacturer.name,
    machineModel: tables.machineModel.modelName,
    modelVariant: tables.machineModel.modelVariant,
    machineType: tables.machineModel.machineType,
    quantity: tables.deployment.quantity,
    technologySupplier: supplier.name,
    technologyProduct: tables.technologyProduct.productName,
    automationLevel: effectiveAutomationLevel,
    environment: tables.deployment.environment,
    installationType: tables.deployment.installationType,
    status: tables.deployment.status,
    commissioningDate: tables.deployment.commissioningDate,
    commissioningYear: tables.deployment.commissioningYear,
    validFrom: tables.deployment.validFrom,
    validTo: tables.deployment.validTo,
  })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.deployment.technologySupplierId))
    .where(buildWhere(filters))
    .orderBy(sql`${REGISTER_SORTS[options.sort]} ${direction} NULLS LAST`, asc(tables.deployment.id))
    // Dynamic mode so pagination can be chained conditionally
    .$dynamic()

  if (options.page) {
    query = query.limit(options.page.limit).offset(options.page.offset)
  }

  return await query
}

/** Number of verified deployments matching the filters, for register pagination. */
export async function countRegisterRows(filters: DeploymentFilters): Promise<number> {
  const rows = await db.select({ count: count() })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.deployment.technologySupplierId))
    .where(buildWhere(filters))
  return rows[0]?.count ?? 0
}

/** Headline statistics over the filtered verified deployments (FR-21). */
export async function summariseDeployments(filters: DeploymentFilters): Promise<DeploymentSummary> {
  const rows = await db.select({
    machineCount: sql<number>`COALESCE(SUM(${tables.deployment.quantity}), 0)::int`,
    siteCount: sql<number>`COUNT(DISTINCT ${tables.deployment.siteId})::int`,
    countryCount: sql<number>`COUNT(DISTINCT ${tables.site.countryCode})::int`,
  })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.deployment.technologySupplierId))
    .where(buildWhere(filters))
  const row = rows[0]

  return {
    machineCount: row?.machineCount ?? 0,
    siteCount: row?.siteCount ?? 0,
    countryCount: row?.countryCount ?? 0,
  }
}
