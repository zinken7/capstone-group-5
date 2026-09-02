import { Router } from 'express'

import { deployments, sites } from '../data/sites.js'
import { deriveSiteStatus } from '../lib/site-status.js'
import type { Deployment } from '../types.js'

const router = Router()

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

interface BoundingBox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
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

router.get('/map', (req, res) => {
  const bbox = parseBbox(stringParam(req.query.bbox))
  if (bbox === undefined) {
    res.status(400).json({ error: 'invalid bbox parameter' })
    return
  }

  const dateParam = stringParam(req.query.date)
  if (dateParam !== undefined && Number.isNaN(Date.parse(dateParam))) {
    res.status(400).json({ error: 'invalid date parameter' })
    return
  }

  const supplier = stringParam(req.query.supplier)
  const country = stringParam(req.query.country)
  const region = stringParam(req.query.region)
  const machineType = stringParam(req.query.machine_type)
  const automationLevel = stringParam(req.query.automation_level)
  const commodity = stringParam(req.query.commodity)
  const environment = stringParam(req.query.environment)

  let excludedCount = 0
  const features = []

  for (const site of sites) {
    if (bbox) {
      const inBoundingBox =
        site.longitude >= bbox.minLon &&
        site.longitude <= bbox.maxLon &&
        site.latitude >= bbox.minLat &&
        site.latitude <= bbox.maxLat
      if (!inBoundingBox) continue
    }
    if (country !== undefined && site.countryCode !== country) continue
    if (region !== undefined && site.region !== region) continue
    if (commodity !== undefined && site.commodity !== commodity) continue

    // FR-43: public views default to verified records only.
    let siteDeployments = deployments.filter(
      (deployment) => deployment.siteId === site.id && deployment.verificationStatus === 'verified',
    )

    if (supplier !== undefined) {
      siteDeployments = siteDeployments.filter((deployment) => deployment.technologySupplier === supplier)
    }
    if (machineType !== undefined) {
      siteDeployments = siteDeployments.filter((deployment) => deployment.machineType === machineType)
    }
    if (automationLevel !== undefined) {
      siteDeployments = siteDeployments.filter((deployment) => deployment.automationLevel === automationLevel)
    }
    if (environment !== undefined) {
      siteDeployments = siteDeployments.filter((deployment) => deployment.environment === environment)
    }
    if (dateParam !== undefined) {
      const withCommissioningDate: Deployment[] = []
      for (const deployment of siteDeployments) {
        if (deployment.commissioningDate === null) {
          excludedCount += 1
        } else {
          withCommissioningDate.push(deployment)
        }
      }
      siteDeployments = withCommissioningDate.filter(
        (deployment) =>
          deployment.commissioningDate !== null &&
          deployment.commissioningDate <= dateParam &&
          deployment.status !== 'decommissioned',
      )
    }

    if (siteDeployments.length === 0) continue

    const status = deriveSiteStatus(siteDeployments)
    const technologySuppliers = [...new Set(siteDeployments.map((deployment) => deployment.technologySupplier))]

    features.push({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [site.longitude, site.latitude],
      },
      properties: {
        id: site.id,
        name: site.name,
        status,
        technology_suppliers: technologySuppliers,
      },
    })
  }

  res.status(200).json({
    type: 'FeatureCollection',
    excluded_count: excludedCount,
    features,
  })
})

export default router
