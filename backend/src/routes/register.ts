import { Router } from 'express'

import { toCsv } from '../lib/csv.js'
import { parseDeploymentFilters } from '../lib/deployment-filters.js'
import type { ParseResult } from '../lib/deployment-filters.js'
import { REGISTER_SORTS, countRegisterRows, findRegisterRows } from '../repositories/deployments.js'
import type { RegisterRow, RegisterSort, SortOrder } from '../repositories/deployments.js'

const router = Router()

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

function parseSort(query: Record<string, unknown>): ParseResult<{ sort: RegisterSort; order: SortOrder }> {
  const sort = query.sort ?? 'site'
  const order = query.order ?? 'asc'

  if (typeof sort !== 'string' || !Object.hasOwn(REGISTER_SORTS, sort)) {
    return { ok: false, error: 'invalid sort parameter' }
  }
  if (order !== 'asc' && order !== 'desc') {
    return { ok: false, error: 'invalid order parameter' }
  }
  return { ok: true, value: { sort: sort as RegisterSort, order } }
}

function parseInteger(raw: unknown, fallback: number, min: number, max: number): number | null {
  if (raw === undefined) return fallback
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return value >= min && value <= max ? value : null
}

export function toRegisterDto(row: RegisterRow) {
  return {
    id: row.id,
    site_id: row.siteId,
    site_name: row.siteName,
    country_code: row.countryCode,
    region: row.region,
    commodity: row.commodity,
    machine_manufacturer: row.machineManufacturer,
    machine_model: row.machineModel,
    model_variant: row.modelVariant,
    machine_type: row.machineType,
    quantity: row.quantity,
    technology_supplier: row.technologySupplier,
    technology_product: row.technologyProduct,
    automation_level: row.automationLevel,
    environment: row.environment,
    installation_type: row.installationType,
    status: row.status,
    commissioning_date: row.commissioningDate,
    commissioning_year: row.commissioningYear,
    valid_from: row.validFrom,
    valid_to: row.validTo,
  }
}

/** Export columns, in order; the same field names as the JSON register. */
const EXPORT_COLUMNS = [
  'id', 'site_id', 'site_name', 'country_code', 'region', 'commodity',
  'machine_manufacturer', 'machine_model', 'model_variant', 'machine_type', 'quantity',
  'technology_supplier', 'technology_product', 'automation_level', 'environment', 'installation_type',
  'status', 'commissioning_date', 'commissioning_year', 'valid_from', 'valid_to',
] as const satisfies ReadonlyArray<keyof ReturnType<typeof toRegisterDto>>

router.get('/register', async (req, res, next) => {
  const filters = parseDeploymentFilters(req.query)
  if (!filters.ok) {
    res.status(400).json({ error: filters.error })
    return
  }

  const sort = parseSort(req.query)
  if (!sort.ok) {
    res.status(400).json({ error: sort.error })
    return
  }

  const limit = parseInteger(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  if (limit === null) {
    res.status(400).json({ error: 'invalid limit parameter' })
    return
  }
  const offset = parseInteger(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER)
  if (offset === null) {
    res.status(400).json({ error: 'invalid offset parameter' })
    return
  }

  try {
    const [total, rows] = await Promise.all([
      countRegisterRows(filters.value),
      findRegisterRows(filters.value, { ...sort.value, page: { limit, offset } }),
    ])

    res.status(200).json({ total, limit, offset, items: rows.map(toRegisterDto) })
  } catch (error) {
    next(error)
  }
})

router.get('/register/export', async (req, res, next) => {
  const filters = parseDeploymentFilters(req.query)
  if (!filters.ok) {
    res.status(400).json({ error: filters.error })
    return
  }

  const sort = parseSort(req.query)
  if (!sort.ok) {
    res.status(400).json({ error: sort.error })
    return
  }

  try {
    const items = (await findRegisterRows(filters.value, sort.value)).map(toRegisterDto)
    const headers = EXPORT_COLUMNS
    const csv = toCsv(headers, items.map((item) => headers.map((column) => item[column])))

    res
      .status(200)
      .type('text/csv; charset=utf-8')
      .attachment('autonomous-mining-equipment.csv')
      .send(csv)
  } catch (error) {
    next(error)
  }
})

export default router
