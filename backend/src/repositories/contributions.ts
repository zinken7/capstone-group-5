import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

import type { Tx } from '../database.js'
import * as tables from '../db/schema.js'

type DeploymentInsert = typeof tables.deployment.$inferInsert
type MachineModelInsert = typeof tables.machineModel.$inferInsert

function firstId(rows: ReadonlyArray<{ id: number }>): number | null {
  return rows[0]?.id ?? null
}

function requireId(rows: ReadonlyArray<{ id: number }>): number {
  const id = firstId(rows)
  if (id === null) throw new Error('Insert returned no id')
  return id
}

/** Reuses a company whose name matches case-insensitively, otherwise creates it. */
export async function findOrCreateCompany(tx: Tx, name: string): Promise<number> {
  const existing = await tx.db
    .select({ id: tables.company.id })
    .from(tables.company)
    .where(sql`lower(${tables.company.name}) = lower(${name})`)
    .orderBy(asc(tables.company.id))
    .limit(1)
  if (existing[0]) return existing[0].id

  const inserted = await tx.db
    .insert(tables.company)
    .values({ name })
    .onConflictDoUpdate({ target: tables.company.name, set: { name: sql`${tables.company.name}` } })
    .returning({ id: tables.company.id })
  return requireId(inserted)
}

export async function findOrCreateRegion(tx: Tx, name: string, countryCode: string): Promise<number> {
  const existing = await tx.db
    .select({ id: tables.region.id })
    .from(tables.region)
    .where(and(sql`lower(${tables.region.name}) = lower(${name})`, eq(tables.region.countryCode, countryCode)))
    .orderBy(asc(tables.region.id))
    .limit(1)
  if (existing[0]) return existing[0].id

  const inserted = await tx.db
    .insert(tables.region)
    .values({ name, countryCode })
    .onConflictDoUpdate({
      target: [tables.region.name, tables.region.countryCode],
      set: { name: sql`${tables.region.name}` },
    })
    .returning({ id: tables.region.id })
  return requireId(inserted)
}

/** Sites have no natural key, so a same-name site in the same country is treated as the same site. */
export async function findOrCreateSite(
  tx: Tx,
  site: { name: string; countryCode: string; regionId: number | null; commodity: string | null; coordinates: { latitude: number; longitude: number } | null },
): Promise<number> {
  const existing = await tx.db
    .select({ id: tables.site.id })
    .from(tables.site)
    .where(and(sql`lower(${tables.site.name}) = lower(${site.name})`, eq(tables.site.countryCode, site.countryCode)))
    .orderBy(asc(tables.site.id))
    .limit(1)
  // A public contribution must not move an existing site. Coordinates for an
  // existing site are changed only through the authenticated admin workflow.
  if (existing[0]) return existing[0].id

  const inserted = await tx.db
    .insert(tables.site)
    .values({
      name: site.name,
      countryCode: site.countryCode,
      regionId: site.regionId,
      commodity: site.commodity,
      point4326: site.coordinates === null ? undefined : [site.coordinates.longitude, site.coordinates.latitude],
    })
    .returning({ id: tables.site.id })
  return requireId(inserted)
}

/** Matches on manufacturer, model name (or machine type when unnamed) and variant, as the unique indexes do. */
export async function findOrCreateMachineModel(
  tx: Tx,
  model: { manufacturerId: number; modelName: string | null; variant: string | null; machineType: string },
): Promise<number> {
  // Variants compare lowercased and null-safely, matching the unique indexes
  const sameVariant = sql`lower(${tables.machineModel.modelVariant}) IS NOT DISTINCT FROM lower(${model.variant}::text)`
  const existing = await tx.db
    .select({ id: tables.machineModel.id })
    .from(tables.machineModel)
    .where(
      model.modelName === null
        ? and(
          eq(tables.machineModel.manufacturerId, model.manufacturerId),
          isNull(tables.machineModel.modelName),
          sql`${tables.machineModel.machineType}::text = ${model.machineType}`,
          sameVariant,
        )
        : and(
          eq(tables.machineModel.manufacturerId, model.manufacturerId),
          sql`lower(${tables.machineModel.modelName}) = lower(${model.modelName})`,
          sameVariant,
        ),
    )
    .orderBy(asc(tables.machineModel.id))
    .limit(1)
  if (existing[0]) return existing[0].id

  const inserted = await tx.db
    .insert(tables.machineModel)
    .values({
      manufacturerId: model.manufacturerId,
      modelName: model.modelName,
      modelVariant: model.variant,
      // Validated against the controlled values upstream; the database enum still rejects anything else
      machineType: model.machineType as MachineModelInsert['machineType'],
    })
    .returning({ id: tables.machineModel.id })
  return requireId(inserted)
}

/** New products start unclassified: the automation level on a product is assigned by an administrator. */
export async function findOrCreateTechnologyProduct(tx: Tx, supplierId: number, productName: string): Promise<number> {
  const existing = await tx.db
    .select({ id: tables.technologyProduct.id })
    .from(tables.technologyProduct)
    .where(and(
      eq(tables.technologyProduct.supplierId, supplierId),
      sql`lower(${tables.technologyProduct.productName}) = lower(${productName})`,
    ))
    .orderBy(asc(tables.technologyProduct.id))
    .limit(1)
  if (existing[0]) return existing[0].id

  const inserted = await tx.db
    .insert(tables.technologyProduct)
    .values({ supplierId, productName })
    .onConflictDoUpdate({
      target: [tables.technologyProduct.supplierId, tables.technologyProduct.productName],
      set: { productName: sql`${tables.technologyProduct.productName}` },
    })
    .returning({ id: tables.technologyProduct.id })
  return requireId(inserted)
}

export async function insertContributor(tx: Tx, contributor: { email: string | null; organisation: string | null }): Promise<number> {
  const inserted = await tx.db
    .insert(tables.contributor)
    .values({ email: contributor.email, organisation: contributor.organisation })
    .returning({ id: tables.contributor.id })
  return requireId(inserted)
}

export interface NewDeployment {
  siteId: number
  machineModelId: number
  technologySupplierId: number
  technologyProductId: number | null
  quantity: number
  environment: string | null
  status: string | null
  automationLevel: string
  installationType: string
  commissioningDate: string | null
  commissioningYear: number | null
}

/** New submissions wait for an administrator, so they start as pending_review. */
export async function insertDeployment(tx: Tx, deployment: NewDeployment): Promise<{ id: number; verificationStatus: string }> {
  const rows = await tx.db
    .insert(tables.deployment)
    .values({
      siteId: deployment.siteId,
      machineModelId: deployment.machineModelId,
      technologySupplierId: deployment.technologySupplierId,
      technologyProductId: deployment.technologyProductId,
      quantity: deployment.quantity,
      // Validated against the controlled values upstream; the database enums still reject anything else
      environment: deployment.environment as DeploymentInsert['environment'],
      status: deployment.status as DeploymentInsert['status'],
      automationLevel: deployment.automationLevel as DeploymentInsert['automationLevel'],
      installationType: deployment.installationType as DeploymentInsert['installationType'],
      commissioningDate: deployment.commissioningDate,
      commissioningYear: deployment.commissioningYear,
      validFrom: deployment.commissioningDate,
      // Submitted as already decommissioned: the window closes today, as for a correction (#156)
      validTo: deployment.status === 'decommissioned' ? closeValidityToday(deployment.commissioningDate) : null,
      verificationStatus: 'pending_review',
    })
    .returning({ id: tables.deployment.id, verificationStatus: tables.deployment.verificationStatus })
  const row = rows[0]
  if (!row) throw new Error('Insert returned no deployment')
  return { id: row.id, verificationStatus: row.verificationStatus }
}

/** Stores the hash of a new submission's private key (FR-59); the key itself is never stored. */
export async function insertContributionKey(tx: Tx, deploymentId: number, keyHash: string): Promise<void> {
  await tx.db.insert(tables.contributionKey).values({ deploymentId, keyHash })
}

/** Links a resubmission to the rejected record it replaces (FR-60). */
export async function insertResubmission(tx: Tx, deploymentId: number, previousDeploymentId: number): Promise<void> {
  await tx.db.insert(tables.resubmission).values({ deploymentId, previousDeploymentId })
}

/** Adds evidence URLs, skipping any already attached to the deployment. */
export async function insertEvidence(tx: Tx, deploymentId: number, urls: readonly string[]): Promise<void> {
  for (const url of urls) {
    await tx.db
      .insert(tables.evidence)
      .values({ deploymentId, url, sourceType: 'other' })
      .onConflictDoNothing({ target: [tables.evidence.deploymentId, tables.evidence.url] })
  }
}

export async function insertRevision(
  tx: Tx,
  revision: {
    deploymentId: number
    contributorId: number | null
    adminUserId?: number | null
    action: 'create' | 'update' | 'verification_change'
    previousValues: Record<string, unknown>
    changeNote: string | null
  },
): Promise<void> {
  await tx.db.insert(tables.revision).values({
    deploymentId: revision.deploymentId,
    contributorId: revision.contributorId,
    adminUserId: revision.adminUserId ?? null,
    action: revision.action,
    previousValues: revision.previousValues,
    changeNote: revision.changeNote,
  })
}

export interface CurrentDeployment {
  id: number
  siteId: number
  siteLatitude: number | null
  siteLongitude: number | null
  quantity: number
  environment: string | null
  status: string | null
  automationLevel: string | null
  installationType: string
  commissioningDate: string | null
  commissioningYear: number | null
  technologySupplierId: number
  validFrom: string | null
  validTo: string | null
  technologyProductId: number | null
  verificationStatus: string
}

/** Reads a deployment and locks its row until the transaction ends, so concurrent corrections queue up. */
export async function lockDeployment(tx: Tx, id: number): Promise<CurrentDeployment | null> {
  const rows = await tx.db
    .select({
      id: tables.deployment.id,
      siteId: tables.site.id,
      siteLatitude: sql<number | null>`ST_Y(${tables.site.point4326})`,
      siteLongitude: sql<number | null>`ST_X(${tables.site.point4326})`,
      quantity: tables.deployment.quantity,
      environment: tables.deployment.environment,
      status: tables.deployment.status,
      automationLevel: tables.deployment.automationLevel,
      installationType: tables.deployment.installationType,
      commissioningDate: tables.deployment.commissioningDate,
      commissioningYear: tables.deployment.commissioningYear,
      technologySupplierId: tables.deployment.technologySupplierId,
      validFrom: tables.deployment.validFrom,
      validTo: tables.deployment.validTo,
      technologyProductId: tables.deployment.technologyProductId,
      verificationStatus: tables.deployment.verificationStatus,
    })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .where(eq(tables.deployment.id, id))
    // Lock only the deployment row. Locking every joined table makes
    // PostgreSQL reject this query because technology_product is an outer join.
    .for('update', { of: tables.deployment })
  return rows[0] ?? null
}

/** Stores the point supplied by an administrator for a contributed site. */
export async function updateSiteCoordinates(
  tx: Tx,
  siteId: number,
  coordinates: { latitude: number; longitude: number },
): Promise<void> {
  await tx.db
    .update(tables.site)
    .set({ point4326: [coordinates.longitude, coordinates.latitude] })
    .where(eq(tables.site.id, siteId))
}

export async function findEvidenceUrls(tx: Tx, deploymentId: number): Promise<string[]> {
  const rows = await tx.db
    .select({ url: tables.evidence.url })
    .from(tables.evidence)
    .where(eq(tables.evidence.deploymentId, deploymentId))
    .orderBy(asc(tables.evidence.id))
  return rows.map((row) => row.url)
}

/** Column name to Drizzle column for every column a correction may write. */
const CORRECTABLE_COLUMNS = {
  quantity: 'quantity',
  environment: 'environment',
  status: 'status',
  automation_level: 'automationLevel',
  installation_type: 'installationType',
  commissioning_date: 'commissioningDate',
  commissioning_year: 'commissioningYear',
  valid_from: 'validFrom',
  valid_to: 'validTo',
  technology_supplier_id: 'technologySupplierId',
  technology_product_id: 'technologyProductId',
} as const satisfies Record<string, keyof DeploymentInsert>

export type CorrectableColumn = keyof typeof CORRECTABLE_COLUMNS

/** End date for a deployment decommissioned without one: today, but never before its window opens. */
export function closeValidityToday(validFrom: string | null): SQL {
  return sql`GREATEST(CURRENT_DATE, ${validFrom}::date)`
}

/**
 * Applies the corrected columns. A contributor's correction returns the record
 * to pending review (FR-48); an administrator's keeps its verification status.
 */
export async function updateDeploymentForReview(
  tx: Tx,
  id: number,
  updates: Partial<Record<CorrectableColumn, unknown>>,
  options: { returnToPending?: boolean } = {},
): Promise<string> {
  const set: Record<string, unknown> = {}
  if (options.returnToPending ?? true) set.verificationStatus = 'pending_review'
  // Column names come from CORRECTABLE_COLUMNS, never from the request
  for (const [column, value] of Object.entries(updates)) {
    set[CORRECTABLE_COLUMNS[column as CorrectableColumn]] = value
  }
  // Keep the statement valid when an administrator only adds evidence
  if (Object.keys(set).length === 0) set.id = sql`${tables.deployment.id}`

  const rows = await tx.db
    .update(tables.deployment)
    .set(set as Partial<DeploymentInsert>)
    .where(eq(tables.deployment.id, id))
    .returning({ verificationStatus: tables.deployment.verificationStatus })
  const row = rows[0]
  if (!row) throw new Error('Update matched no deployment')
  return row.verificationStatus
}
