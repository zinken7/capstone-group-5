import { Router } from 'express'

import { parseDeploymentFilters } from '../lib/deployment-filters.js'
import { CROSSTAB_DIMENSIONS, findBreakdowns, findCrosstab, findTimeline } from '../repositories/analytics.js'
import type { BreakdownItem, CrosstabDimension } from '../repositories/analytics.js'
import { summariseDeployments } from '../repositories/deployments.js'

const router = Router()

router.get('/analytics/summary', async (req, res, next) => {
  const filters = parseDeploymentFilters(req.query)
  if (!filters.ok) {
    res.status(400).json({ error: filters.error })
    return
  }

  try {
    const summary = await summariseDeployments(filters.value)

    res.status(200).json({
      machine_count: summary.machineCount,
      site_count: summary.siteCount,
      country_count: summary.countryCount,
    })
  } catch (error) {
    next(error)
  }
})

function toBreakdownDto(items: BreakdownItem[]) {
  return items.map((item) => ({ key: item.key, machine_count: item.machineCount, share: item.share }))
}

router.get('/analytics/breakdowns', async (req, res, next) => {
  const filters = parseDeploymentFilters(req.query)
  if (!filters.ok) {
    res.status(400).json({ error: filters.error })
    return
  }

  try {
    const breakdowns = await findBreakdowns(filters.value)

    res.status(200).json({
      machine_count: breakdowns.machineCount,
      by_country: toBreakdownDto(breakdowns.byCountry),
      by_machine_type: toBreakdownDto(breakdowns.byMachineType),
      by_manufacturer: toBreakdownDto(breakdowns.byManufacturer),
      by_supplier: toBreakdownDto(breakdowns.bySupplier),
      by_automation_level: toBreakdownDto(breakdowns.byAutomationLevel),
      by_status: toBreakdownDto(breakdowns.byStatus),
      by_commodity: toBreakdownDto(breakdowns.byCommodity),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/analytics/timeline', async (req, res, next) => {
  const filters = parseDeploymentFilters(req.query)
  if (!filters.ok) {
    res.status(400).json({ error: filters.error })
    return
  }

  try {
    const timeline = await findTimeline(filters.value)

    res.status(200).json({
      excluded_count: timeline.excludedCount,
      excluded_machine_count: timeline.excludedMachineCount,
      years: timeline.years.map((row) => ({
        year: row.year,
        newly_commissioned: row.newlyCommissioned,
        in_service: row.inService,
      })),
    })
  } catch (error) {
    next(error)
  }
})

function parseDimension(value: unknown): CrosstabDimension | null {
  return typeof value === 'string' && Object.hasOwn(CROSSTAB_DIMENSIONS, value) ? value as CrosstabDimension : null
}

router.get('/analytics/crosstab', async (req, res, next) => {
  const rows = parseDimension(req.query.rows)
  const columns = parseDimension(req.query.columns)
  if (!rows) {
    res.status(400).json({ error: 'invalid rows parameter' })
    return
  }
  if (!columns || columns === rows) {
    res.status(400).json({ error: 'invalid columns parameter' })
    return
  }
  const filters = parseDeploymentFilters(req.query)
  if (!filters.ok) {
    res.status(400).json({ error: filters.error })
    return
  }

  try {
    const crosstab = await findCrosstab(rows, columns, filters.value)

    res.status(200).json({
      rows,
      columns,
      machine_count: crosstab.machineCount,
      cells: crosstab.cells.map((cell) => ({ row: cell.row, column: cell.column, machine_count: cell.machineCount })),
    })
  } catch (error) {
    next(error)
  }
})

export default router
