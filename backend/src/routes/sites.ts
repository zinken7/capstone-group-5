import { Router } from 'express'

import { deployments, sites } from '../data/sites.js'

const router = Router()

router.get('/sites/:id', (req, res) => {
  const id = Number(req.params.id)
  const site = sites.find((candidate) => candidate.id === id)

  if (!site) {
    res.status(404).json({ error: 'site not found' })
    return
  }

  // FR-43: public views default to verified records only.
  const siteDeployments = deployments.filter(
    (deployment) => deployment.siteId === site.id && deployment.verificationStatus === 'verified',
  )

  res.status(200).json({
    id: site.id,
    name: site.name,
    country_code: site.countryCode,
    region: site.region,
    commodity: site.commodity,
    mine_status: site.mineStatus,
    latitude: site.latitude,
    longitude: site.longitude,
    deployments: siteDeployments.map((deployment) => ({
      id: deployment.id,
      machine_manufacturer: deployment.machineManufacturer,
      machine_model: deployment.machineModel,
      machine_type: deployment.machineType,
      quantity: deployment.quantity,
      technology_supplier: deployment.technologySupplier,
      automation_level: deployment.automationLevel,
      environment: deployment.environment,
      status: deployment.status,
      commissioning_date: deployment.commissioningDate,
      valid_from: deployment.validFrom,
      valid_to: deployment.validTo,
    })),
  })
})

export default router
