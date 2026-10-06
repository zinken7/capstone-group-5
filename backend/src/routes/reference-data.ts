import { Router } from 'express'

import {
  AUTOMATION_LEVELS,
  COUNTRY_CODES,
  DEPLOYMENT_STATUSES,
  INSTALLATION_TYPES,
  MACHINE_TYPES,
  MINING_ENVIRONMENTS,
} from '../lib/controlled-values.js'

const router = Router()

router.get('/reference-data', (_req, res) => {
  res.status(200).json({
    machine_types: MACHINE_TYPES,
    automation_levels: AUTOMATION_LEVELS,
    environments: MINING_ENVIRONMENTS,
    deployment_statuses: DEPLOYMENT_STATUSES,
    installation_types: INSTALLATION_TYPES,
    countries: COUNTRY_CODES,
  })
})

export default router
