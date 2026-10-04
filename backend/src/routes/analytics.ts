import { Router } from 'express'

import { parseDeploymentFilters } from '../lib/deployment-filters.js'
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

export default router
