import { query } from '../database.js'
import type { DeploymentFilters } from '../lib/deployment-filters.js'

export const REGISTER_SORTS = {
  site: 's.name',
  country: 's.country_code',
  manufacturer: 'mc.name',
  machine_type: 'm.machine_type::text',
  supplier: 'sc.name',
  status: 'd.status::text',
  quantity: 'd.quantity',
  commissioning: 'COALESCE(d.commissioning_date, make_date(d.commissioning_year, 1, 1))',
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

const FROM_VERIFIED_DEPLOYMENTS = `
  FROM deployment d
  JOIN site s ON s.id = d.site_id
  LEFT JOIN region r ON r.id = s.region_id
  JOIN machine_model m ON m.id = d.machine_model_id
  JOIN company mc ON mc.id = m.manufacturer_id
  LEFT JOIN technology_product p ON p.id = d.technology_product_id
  LEFT JOIN company sc ON sc.id = p.supplier_id
`

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
}

/** Builds the WHERE clause; values go into params, never into the SQL text (NFR-05). */
function buildWhere(filters: DeploymentFilters, params: unknown[]): string {
  const conditions = [`d.verification_status = 'verified'`]
  const add = (sql: (placeholder: string) => string, value: unknown) => {
    params.push(value)
    conditions.push(sql(`$${params.length}`))
  }

  if (filters.q !== undefined) {
    add((ph) => `(s.name ILIKE ${ph} OR m.model_name ILIKE ${ph} OR mc.name ILIKE ${ph} OR sc.name ILIKE ${ph} OR p.product_name ILIKE ${ph})`, likePattern(filters.q))
  }
  if (filters.country !== undefined) add((ph) => `s.country_code = ${ph}`, filters.country)
  if (filters.region !== undefined) add((ph) => `r.name = ${ph}`, filters.region)
  if (filters.commodity !== undefined) add((ph) => `s.commodity = ${ph}`, filters.commodity)
  if (filters.supplier !== undefined) add((ph) => `sc.name = ${ph}`, filters.supplier)
  if (filters.manufacturer !== undefined) add((ph) => `mc.name = ${ph}`, filters.manufacturer)
  // Enum columns compare as text so an unknown value matches nothing instead of erroring
  if (filters.machineType !== undefined) add((ph) => `m.machine_type::text = ${ph}`, filters.machineType)
  if (filters.automationLevel !== undefined) {
    add((ph) => `COALESCE(d.automation_level, p.automation_level)::text = ${ph}`, filters.automationLevel)
  }
  if (filters.environment !== undefined) add((ph) => `d.environment::text = ${ph}`, filters.environment)
  if (filters.status !== undefined) add((ph) => `d.status::text = ${ph}`, filters.status)

  return `WHERE ${conditions.join(' AND ')}`
}

interface RegisterDbRow {
  id: number
  site_id: number
  site_name: string
  country_code: string
  region: string | null
  commodity: string | null
  machine_manufacturer: string
  machine_model: string | null
  model_variant: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  automation_level: string | null
  environment: string | null
  installation_type: string
  status: string | null
  commissioning_date: string | null
  commissioning_year: number | null
  valid_from: string | null
  valid_to: string | null
}

/** Flattened verified deployments for the equipment register (FR-36) and export (FR-37). */
export async function findRegisterRows(filters: DeploymentFilters, options: RegisterQuery): Promise<RegisterRow[]> {
  const params: unknown[] = []
  const where = buildWhere(filters, params)
  // Sort column comes from the REGISTER_SORTS whitelist, not from user input
  const orderBy = `${REGISTER_SORTS[options.sort]} ${options.order === 'desc' ? 'DESC' : 'ASC'} NULLS LAST, d.id ASC`

  let pagination = ''
  if (options.page) {
    params.push(options.page.limit, options.page.offset)
    pagination = `LIMIT $${params.length - 1} OFFSET $${params.length}`
  }

  const rows = await query<RegisterDbRow>(
    `
    SELECT
      d.id::int AS id,
      s.id::int AS site_id,
      s.name AS site_name,
      s.country_code,
      r.name AS region,
      s.commodity,
      mc.name AS machine_manufacturer,
      m.model_name AS machine_model,
      m.model_variant,
      m.machine_type::text AS machine_type,
      d.quantity,
      sc.name AS technology_supplier,
      p.product_name AS technology_product,
      COALESCE(d.automation_level, p.automation_level)::text AS automation_level,
      d.environment::text AS environment,
      d.installation_type::text AS installation_type,
      d.status::text AS status,
      d.commissioning_date::text AS commissioning_date,
      d.commissioning_year::int AS commissioning_year,
      d.valid_from::text AS valid_from,
      d.valid_to::text AS valid_to
    ${FROM_VERIFIED_DEPLOYMENTS}
    ${where}
    ORDER BY ${orderBy}
    ${pagination}
    `,
    params,
  )

  return rows.map((row) => ({
    id: row.id,
    siteId: row.site_id,
    siteName: row.site_name,
    countryCode: row.country_code,
    region: row.region,
    commodity: row.commodity,
    machineManufacturer: row.machine_manufacturer,
    machineModel: row.machine_model,
    modelVariant: row.model_variant,
    machineType: row.machine_type,
    quantity: row.quantity,
    technologySupplier: row.technology_supplier,
    technologyProduct: row.technology_product,
    automationLevel: row.automation_level,
    environment: row.environment,
    installationType: row.installation_type,
    status: row.status,
    commissioningDate: row.commissioning_date,
    commissioningYear: row.commissioning_year,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  }))
}

/** Number of verified deployments matching the filters, for register pagination. */
export async function countRegisterRows(filters: DeploymentFilters): Promise<number> {
  const params: unknown[] = []
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count ${FROM_VERIFIED_DEPLOYMENTS} ${buildWhere(filters, params)}`,
    params,
  )
  return rows[0]?.count ?? 0
}

/** Headline statistics over the filtered verified deployments (FR-21). */
export async function summariseDeployments(filters: DeploymentFilters): Promise<DeploymentSummary> {
  const params: unknown[] = []
  const rows = await query<{ machine_count: number; site_count: number; country_count: number }>(
    `
    SELECT
      COALESCE(SUM(d.quantity), 0)::int AS machine_count,
      COUNT(DISTINCT d.site_id)::int AS site_count,
      COUNT(DISTINCT s.country_code)::int AS country_count
    ${FROM_VERIFIED_DEPLOYMENTS}
    ${buildWhere(filters, params)}
    `,
    params,
  )
  const row = rows[0]

  return {
    machineCount: row?.machine_count ?? 0,
    siteCount: row?.site_count ?? 0,
    countryCount: row?.country_count ?? 0,
  }
}
