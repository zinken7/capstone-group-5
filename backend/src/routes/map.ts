import { Router } from 'express'

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

router.get('/map', async (req, res, next) => {
  const bbox = parseBbox(stringParam(req.query.bbox))
  if (bbox === undefined) {
    res.status(400).json({ error: 'invalid bbox parameter' })
    return
  }

  const date = stringParam(req.query.date)
  if (date !== undefined && Number.isNaN(Date.parse(date))) {
    res.status(400).json({ error: 'invalid date parameter' })
    return
  }

  try {
    // All filtering runs in SQL; this only assembles the GeoJSON
    const { sites, excludedCount } = await findMapSites({
      bbox,
      date,
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
          status: site.status,
          technology_suppliers: site.technologySuppliers,
        },
      })),
    })
  } catch (error) {
    next(error)
  }
})

export default router
