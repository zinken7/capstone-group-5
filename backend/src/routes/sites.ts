import { Router } from 'express'

import { findSiteById, findVerifiedDeploymentsBySite } from '../repositories/sites.js'

const router = Router()

/** Only positive integer ids; anything else is 404 as before */
function parseSiteId(raw: string | undefined): number | null {
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

router.get('/sites/:id', async (req, res, next) => {
  const id = parseSiteId(req.params.id)
  if (id === null) {
    res.status(404).json({ error: 'site not found' })
    return
  }

  try {
    const site = await findSiteById(id)
    if (!site) {
      res.status(404).json({ error: 'site not found' })
      return
    }

    // FR-43: public views default to verified records only.
    const deployments = await findVerifiedDeploymentsBySite(site.id)

    res.status(200).json({
      id: site.id,
      name: site.name,
      country_code: site.countryCode,
      region: site.region,
      commodity: site.commodity,
      mine_status: site.mineStatus,
      latitude: site.latitude,
      longitude: site.longitude,
      deployments: deployments.map((deployment) => ({
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
        commissioning_year: deployment.commissioningYear,
        valid_from: deployment.validFrom,
        valid_to: deployment.validTo,
      })),
    })
  } catch (error) {
    next(error)
  }
})

export default router
