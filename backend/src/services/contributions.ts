import { withTransaction } from '../database.js'
import { createContributionKey } from '../lib/contribution-key.js'
import type { ContributionInput } from '../lib/contribution-validation.js'
import {
  findOrCreateCompany,
  findOrCreateMachineModel,
  findOrCreateRegion,
  findOrCreateSite,
  findOrCreateTechnologyProduct,
  insertContributionKey,
  insertContributor,
  insertDeployment,
  insertEvidence,
  insertRevision,
} from '../repositories/contributions.js'

export interface ContributionResult {
  id: number
  verificationStatus: string
  /** The submission's private key, returned once; only its hash is stored (FR-59) */
  key: string
}

/** The submission as received, minus contact details, kept on the create revision (FR-47). */
function submissionSnapshot(input: ContributionInput): Record<string, unknown> {
  return {
    site_name: input.siteName,
    country_code: input.countryCode,
    latitude: input.coordinates?.latitude ?? null,
    longitude: input.coordinates?.longitude ?? null,
    region: input.region,
    commodity: input.commodity,
    machine_type: input.machineType,
    machine_manufacturer: input.machineManufacturer,
    machine_model: input.machineModel,
    machine_model_variant: input.machineModelVariant,
    quantity: input.quantity,
    environment: input.environment,
    deployment_status: input.deploymentStatus,
    automation_level: input.automationLevel,
    installation_type: input.installationType,
    technology_supplier: input.technologySupplier,
    technology_product: input.technologyProduct,
    commissioning_date: input.commissioning?.date ?? input.commissioning?.year.toString() ?? null,
    evidence_urls: input.evidenceUrls,
  }
}

/** Stores a public submission and its evidence atomically; nothing is kept if any step fails. */
export async function createContribution(input: ContributionInput): Promise<ContributionResult> {
  return withTransaction(async (tx) => {
    const manufacturerId = await findOrCreateCompany(tx, input.machineManufacturer)
    const regionId = input.region === null ? null : await findOrCreateRegion(tx, input.region, input.countryCode)
    const siteId = await findOrCreateSite(tx, {
      name: input.siteName,
      countryCode: input.countryCode,
      regionId,
      commodity: input.commodity,
      coordinates: input.coordinates,
    })
    const machineModelId = await findOrCreateMachineModel(tx, {
      manufacturerId,
      modelName: input.machineModel,
      variant: input.machineModelVariant,
      machineType: input.machineType,
    })

    // The supplier is stored on the deployment; a product is optional and, when named, belongs to that supplier
    const supplierId = await findOrCreateCompany(tx, input.technologySupplier)
    const technologyProductId = input.technologyProduct === null
      ? null
      : await findOrCreateTechnologyProduct(tx, supplierId, input.technologyProduct)

    // Each revision names exactly one actor, so an anonymous submission still gets a contributor row
    const contributorId = await insertContributor(tx, { email: input.contributorEmail, organisation: input.organisation })
    const { key, hash } = createContributionKey()

    const deployment = await insertDeployment(tx, {
      siteId,
      machineModelId,
      technologySupplierId: supplierId,
      technologyProductId,
      quantity: input.quantity,
      environment: input.environment,
      status: input.deploymentStatus,
      automationLevel: input.automationLevel,
      installationType: input.installationType,
      commissioningDate: input.commissioning?.date ?? null,
      commissioningYear: input.commissioning?.year ?? null,
    })
    await insertContributionKey(tx, deployment.id, hash)

    await insertEvidence(tx, deployment.id, input.evidenceUrls)
    await insertRevision(tx, {
      deploymentId: deployment.id,
      contributorId,
      action: 'create',
      previousValues: submissionSnapshot(input),
      changeNote: null,
    })

    return { ...deployment, key }
  })
}
