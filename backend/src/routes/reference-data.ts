import { Router } from 'express'

import {
  AUTOMATION_LEVELS,
  COUNTRY_CODES,
  DEPLOYMENT_STATUSES,
  INSTALLATION_TYPES,
  MACHINE_TYPES,
  MINING_ENVIRONMENTS,
} from '../lib/controlled-values.js'
import { listTechnologyProducts } from '../repositories/reference-data.js'

const router = Router()

router.get('/reference-data', async (_req, res, next) => {
  try {
    res.status(200).json({
      machine_types: MACHINE_TYPES,
      automation_levels: AUTOMATION_LEVELS,
      environments: MINING_ENVIRONMENTS,
      deployment_statuses: DEPLOYMENT_STATUSES,
      installation_types: INSTALLATION_TYPES,
      countries: COUNTRY_CODES,
      technology_products: (await listTechnologyProducts()).map((item) => ({
        supplier: item.supplier,
        product: item.product,
        automation_level: item.automationLevel,
      })),
    })
  } catch (error) {
    next(error)
  }
})

export default router
