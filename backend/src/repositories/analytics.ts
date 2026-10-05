import { query } from '../database.js'
import { AUTOMATION_LEVELS } from '../lib/controlled-values.js'
import type { DeploymentFilters } from '../lib/deployment-filters.js'
import { FROM_VERIFIED_DEPLOYMENTS, buildWhere } from './deployments.js'

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

/** Grouping expressions over FROM_VERIFIED_DEPLOYMENTS; fixed here, never taken from the request. */
const DIMENSIONS = {
  country: 's.country_code',
  machineType: 'm.machine_type::text',
  manufacturer: 'mc.name',
  supplier: 'sc.name',
  automationLevel: 'COALESCE(d.automation_level, p.automation_level)::text',
} as const

type Dimension = keyof typeof DIMENSIONS

async function machinesBy(dimension: Dimension, filters: DeploymentFilters): Promise<Array<{ key: string | null; machineCount: number }>> {
  const params: unknown[] = []
  const rows = await query<{ key: string | null; machine_count: number }>(
    `
    SELECT ${DIMENSIONS[dimension]} AS key, SUM(d.quantity)::int AS machine_count
    ${FROM_VERIFIED_DEPLOYMENTS}
    ${buildWhere(filters, params)}
    GROUP BY 1
    `,
    params,
  )
  return rows.map((row) => ({ key: row.key, machineCount: row.machine_count }))
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

/** Per year to the current year: machines newly commissioned (FR-30) and in service on 31 December (FR-22). */
export async function findTimeline(filters: DeploymentFilters): Promise<Timeline> {
  const params: unknown[] = []
  const where = buildWhere(filters, params)

  const [years, excluded] = await Promise.all([
    query<{ year: number; newly_commissioned: number; in_service: number }>(
      `
      WITH dated AS (
        SELECT
          d.quantity,
          COALESCE(d.commissioning_year::int, EXTRACT(YEAR FROM d.commissioning_date)::int) AS start_year,
          d.valid_to
        ${FROM_VERIFIED_DEPLOYMENTS}
        ${where}
      ),
      span AS (
        SELECT generate_series(MIN(start_year), GREATEST(MAX(start_year), EXTRACT(YEAR FROM CURRENT_DATE)::int)) AS year
        FROM dated
        WHERE start_year IS NOT NULL
      )
      SELECT
        span.year,
        COALESCE(SUM(dated.quantity) FILTER (WHERE dated.start_year = span.year), 0)::int AS newly_commissioned,
        COALESCE(SUM(dated.quantity) FILTER (
          WHERE dated.valid_to IS NULL OR dated.valid_to >= make_date(span.year, 12, 31)
        ), 0)::int AS in_service
      FROM span
      LEFT JOIN dated ON dated.start_year <= span.year
      GROUP BY span.year
      ORDER BY span.year
      `,
      params,
    ),
    query<{ excluded_count: number; excluded_machine_count: number }>(
      `
      SELECT COUNT(*)::int AS excluded_count, COALESCE(SUM(d.quantity), 0)::int AS excluded_machine_count
      ${FROM_VERIFIED_DEPLOYMENTS}
      ${where}
        AND d.commissioning_year IS NULL
        AND d.commissioning_date IS NULL
      `,
      params,
    ),
  ])

  return {
    years: years.map((row) => ({ year: row.year, newlyCommissioned: row.newly_commissioned, inService: row.in_service })),
    excludedCount: excluded[0]?.excluded_count ?? 0,
    excludedMachineCount: excluded[0]?.excluded_machine_count ?? 0,
  }
}
