import { Router } from 'express'

import { isCalendarDate } from '../lib/contribution-validation.js'
import { findMapSites } from '../repositories/sites.js'
import type { BoundingBox } from '../repositories/sites.js'

const router = Router()

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Returns null when no bbox was given, undefined when the given bbox is malformed. */
function parseBbox(raw: string | undefined): BoundingBox | null | undefined {
  if (raw === undefined) return null

  const parts = raw.split(',').map(Number)
  const [minLon, minLat, maxLon, maxLat] = parts

  if (
    parts.length !== 4 ||
    minLon === undefined ||
    minLat === undefined ||
    maxLon === undefined ||
    maxLat === undefined ||
    [minLon, minLat, maxLon, maxLat].some((value) => Number.isNaN(value))
  ) {
    return undefined
  }

  return { minLon, minLat, maxLon, maxLat }
}

/** Null when no year was given, undefined when the given year is malformed. */
function parseYear(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return null
  return /^\d{4}$/.test(raw) && Number(raw) >= 1900 ? Number(raw) : undefined
}

/** "true" or "false"; undefined when the value is anything else. */
function parseFlag(raw: string | undefined): boolean | undefined {
  if (raw === undefined || raw === 'false') return false
  return raw === 'true' ? true : undefined
}

router.get('/map', async (req, res, next) => {
  const bbox = parseBbox(stringParam(req.query.bbox))
  if (bbox === undefined) {
    res.status(400).json({ error: 'invalid bbox parameter' })
    return
  }

  const date = stringParam(req.query.date)
  // Strict, so a date PostgreSQL would reject, such as 2024-02-30, is a 400 rather than a failed query
  if (date !== undefined && !isCalendarDate(date)) {
    res.status(400).json({ error: 'invalid date parameter' })
    return
  }

  const year = parseYear(stringParam(req.query.year))
  if (year === undefined) {
    res.status(400).json({ error: 'invalid year parameter' })
    return
  }
  if (date !== undefined && year !== null) {
    res.status(400).json({ error: 'use either date or year, not both' })
    return
  }

  const includeDecommissioned = parseFlag(stringParam(req.query.include_decommissioned))
  if (includeDecommissioned === undefined) {
    res.status(400).json({ error: 'invalid include_decommissioned parameter' })
    return
  }

  try {
    // All filtering runs in SQL; this only assembles the GeoJSON
    const { sites, excludedCount } = await findMapSites({
      bbox,
      date,
      year: year ?? undefined,
      includeDecommissioned,
      supplier: stringParam(req.query.supplier),
      country: stringParam(req.query.country),
      region: stringParam(req.query.region),
      machineType: stringParam(req.query.machine_type),
      automationLevel: stringParam(req.query.automation_level),
      commodity: stringParam(req.query.commodity),
      environment: stringParam(req.query.environment),
    })

    res.status(200).json({
      type: 'FeatureCollection',
      excluded_count: excludedCount,
      features: sites.map((site) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [site.longitude, site.latitude],
        },
        properties: {
          id: site.id,
          name: site.name,
          country_code: site.countryCode,
          region: site.region,
          commodity: site.commodity,
          status: site.status,
          technology_suppliers: site.technologySuppliers,
          machine_count: site.machineCount,
          deployment_count: site.deploymentCount,
        },
      })),
    })
  } catch (error) {
    next(error)
  }
})

export default router
