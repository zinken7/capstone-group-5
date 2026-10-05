import { and, eq, sql } from 'drizzle-orm'

import { db } from '../database.js'
import * as tables from '../db/schema.js'
import { AUTOMATION_LEVELS } from '../lib/controlled-values.js'
import type { DeploymentFilters } from '../lib/deployment-filters.js'
import { buildWhere, effectiveAutomationLevel, manufacturer, supplier } from './deployments.js'

/** One group of a breakdown; key is null for the unknown or unclassified group. */
export interface BreakdownItem {
  key: string | null
  machineCount: number
  share: number
}

export interface Breakdowns {
  machineCount: number
  byCountry: BreakdownItem[]
  byMachineType: BreakdownItem[]
  byManufacturer: BreakdownItem[]
  bySupplier: BreakdownItem[]
  byAutomationLevel: BreakdownItem[]
}

/** Grouping expressions over the register's joins; fixed here, never taken from the request. */
const DIMENSIONS = {
  country: sql<string | null>`${tables.site.countryCode}`,
  machineType: sql<string | null>`${tables.machineModel.machineType}::text`,
  manufacturer: sql<string | null>`${manufacturer.name}`,
  supplier: sql<string | null>`${supplier.name}`,
  automationLevel: effectiveAutomationLevel,
} as const

type Dimension = keyof typeof DIMENSIONS

// Each query repeats the register's joins, as deployments.ts does, because buildWhere relies on them

async function machinesBy(dimension: Dimension, filters: DeploymentFilters): Promise<Array<{ key: string | null; machineCount: number }>> {
  const key = DIMENSIONS[dimension]
  return await db.select({ key, machineCount: sql<number>`SUM(${tables.deployment.quantity})::int` })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.technologyProduct.supplierId))
    .where(buildWhere(filters))
    .groupBy(key)
}

function withShares(groups: Array<{ key: string | null; machineCount: number }>, total: number): BreakdownItem[] {
  return groups.map((group) => ({ ...group, share: total > 0 ? group.machineCount / total : 0 }))
}

/** Largest first, ties by name, and the unknown group last (FR-31 ranking). */
function ranked(groups: Array<{ key: string | null; machineCount: number }>) {
  return [...groups].sort((left, right) => {
    if (left.key === null || right.key === null) return Number(left.key === null) - Number(right.key === null)
    return right.machineCount - left.machineCount || left.key.localeCompare(right.key)
  })
}

/** Every level in its fixed order plus the unclassified group, so empty levels still appear (FR-29). */
function byLevel(groups: Array<{ key: string | null; machineCount: number }>) {
  const counts = new Map(groups.map((group) => [group.key, group.machineCount]))
  return [...AUTOMATION_LEVELS, null].map((key) => ({ key, machineCount: counts.get(key) ?? 0 }))
}

/** Machine counts and shares over the filtered verified deployments (FR-23 to FR-26, FR-29). */
export async function findBreakdowns(filters: DeploymentFilters): Promise<Breakdowns> {
  const [byCountry, byMachineType, byManufacturer, bySupplier, byAutomationLevel] = await Promise.all([
    machinesBy('country', filters),
    machinesBy('machineType', filters),
    machinesBy('manufacturer', filters),
    machinesBy('supplier', filters),
    machinesBy('automationLevel', filters),
  ])
  const machineCount = byCountry.reduce((total, group) => total + group.machineCount, 0)

  return {
    machineCount,
    byCountry: withShares(ranked(byCountry), machineCount),
    byMachineType: withShares(ranked(byMachineType), machineCount),
    byManufacturer: withShares(ranked(byManufacturer), machineCount),
    bySupplier: withShares(ranked(bySupplier), machineCount),
    byAutomationLevel: withShares(byLevel(byAutomationLevel), machineCount),
  }
}

export interface TimelineYear {
  year: number
  newlyCommissioned: number
  inService: number
}

export interface Timeline {
  years: TimelineYear[]
  /** Deployments, and their machines, left out because no commissioning year is recorded */
  excludedCount: number
  excludedMachineCount: number
}

/** Announced deployments are not commissioned yet, so no timeline measure counts them */
const notAnnounced = sql`${tables.deployment.status} IS DISTINCT FROM 'announced'`
const startYear = sql<number | null>`COALESCE(${tables.deployment.commissioningYear}::int, EXTRACT(YEAR FROM ${tables.deployment.commissioningDate})::int)`
// Like the map's date filter, a record is in service on 31 December only inside its valid_from..valid_to window
const firstYearInService = sql<number | null>`EXTRACT(YEAR FROM ${tables.deployment.validFrom})::int`
const lastYearInService = sql<number | null>`EXTRACT(YEAR FROM ${tables.deployment.validTo} + 1)::int - 1`

/** Per year to the current year: machines newly commissioned (FR-30) and in service on 31 December (FR-22). */
export async function findTimeline(filters: DeploymentFilters): Promise<Timeline> {
  const [groups, excluded, [today]] = await Promise.all([
    db.select({ startYear, firstYearInService, lastYearInService, machines: sql<number>`SUM(${tables.deployment.quantity})::int` })
      .from(tables.deployment)
      .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
      .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
      .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
      .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
      .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
      .leftJoin(supplier, eq(supplier.id, tables.technologyProduct.supplierId))
      .where(and(buildWhere(filters), notAnnounced, sql`${startYear} IS NOT NULL`))
      .groupBy(startYear, firstYearInService, lastYearInService),
    db.select({
      count: sql<number>`COUNT(*)::int`,
      machines: sql<number>`COALESCE(SUM(${tables.deployment.quantity}), 0)::int`,
    })
      .from(tables.deployment)
      .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
      .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
      .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
      .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
      .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
      .leftJoin(supplier, eq(supplier.id, tables.technologyProduct.supplierId))
      .where(and(buildWhere(filters), notAnnounced, sql`${startYear} IS NULL`)),
    db.execute<{ year: number }>(sql`SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS year`).then((result) => result.rows),
  ])

  const currentYear = today?.year ?? new Date().getFullYear()
  const firstYear = Math.min(...groups.map((group) => group.startYear ?? currentYear))
  const years: TimelineYear[] = []
  for (let year = firstYear; groups.length > 0 && year <= currentYear; year += 1) {
    let newlyCommissioned = 0
    let inService = 0
    for (const group of groups) {
      if (group.startYear === year) newlyCommissioned += group.machines
      const started = group.startYear !== null && group.startYear <= year
      const valid = (group.firstYearInService === null || group.firstYearInService <= year)
        && (group.lastYearInService === null || group.lastYearInService >= year)
      if (started && valid) inService += group.machines
    }
    years.push({ year, newlyCommissioned, inService })
  }

  return {
    years,
    excludedCount: excluded[0]?.count ?? 0,
    excludedMachineCount: excluded[0]?.machines ?? 0,
  }
}
