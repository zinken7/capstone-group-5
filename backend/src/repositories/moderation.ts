import { asc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '../database.js'
import type { Tx } from '../database.js'
import * as tables from '../db/schema.js'
import { isoTimestamp } from '../lib/iso-timestamp.js'

// company joins twice: once as the machine manufacturer, once as the technology supplier
const manufacturer = alias(tables.company, 'manufacturer')
const supplier = alias(tables.company, 'supplier')

// The outer deployment reference is spelled out: Drizzle renders columns of a
// single-table select unqualified, and an unqualified "id" inside the subquery
// would resolve to evidence's own id instead of correlating.
const evidenceCount = sql<number>`(SELECT COUNT(*)::int FROM ${tables.evidence} e WHERE e.deployment_id = "deployment"."id")`

export interface QueueItem {
  id: number
  site_name: string
  country_code: string
  region: string | null
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  evidence_count: number
  submitted_at: string
}

/** Records waiting for a decision, least recently changed first. */
export async function listPendingReviews(): Promise<QueueItem[]> {
  return await db
    .select({
      id: tables.deployment.id,
      site_name: tables.site.name,
      country_code: tables.site.countryCode,
      region: tables.region.name,
      machine_manufacturer: manufacturer.name,
      machine_model: tables.machineModel.modelName,
      machine_type: tables.machineModel.machineType,
      quantity: tables.deployment.quantity,
      technology_supplier: supplier.name,
      technology_product: tables.technologyProduct.productName,
      evidence_count: evidenceCount,
      submitted_at: isoTimestamp(tables.deployment.updatedAt),
    })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.technologyProduct.supplierId))
    .where(eq(tables.deployment.verificationStatus, 'pending_review'))
    .orderBy(asc(tables.deployment.updatedAt), asc(tables.deployment.id))
}

export interface ReviewRecord {
  id: number
  verification_status: string
  site_id: number
  site_name: string
  country_code: string
  region: string | null
  commodity: string | null
  machine_manufacturer: string
  machine_model: string | null
  model_variant: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  automation_level: string | null
  environment: string | null
  installation_type: string
  status: string | null
  commissioning_date: string | null
  commissioning_year: number | null
  valid_from: string | null
  valid_to: string | null
  created_at: string
  updated_at: string
  evidence: { url: string; source_type: string; publisher: string | null; published_date: string | null }[]
  reviews: { decision: string; note: string | null; administrator: string; reviewed_at: string }[]
  revisions: {
    action: string
    previous_values: Record<string, unknown> | null
    change_note: string | null
    contributor_email: string | null
    contributor_organisation: string | null
    administrator: string | null
    changed_at: string
  }[]
}

/** One record in any verification status, with its evidence and full history. */
export async function findReviewRecord(id: number): Promise<ReviewRecord | null> {
  const rows = await db
    .select({
      id: tables.deployment.id,
      verification_status: tables.deployment.verificationStatus,
      site_id: tables.site.id,
      site_name: tables.site.name,
      country_code: tables.site.countryCode,
      region: tables.region.name,
      commodity: tables.site.commodity,
      machine_manufacturer: manufacturer.name,
      machine_model: tables.machineModel.modelName,
      model_variant: tables.machineModel.modelVariant,
      machine_type: tables.machineModel.machineType,
      quantity: tables.deployment.quantity,
      technology_supplier: supplier.name,
      technology_product: tables.technologyProduct.productName,
      automation_level: tables.deployment.automationLevel,
      environment: tables.deployment.environment,
      installation_type: tables.deployment.installationType,
      status: tables.deployment.status,
      commissioning_date: tables.deployment.commissioningDate,
      commissioning_year: tables.deployment.commissioningYear,
      valid_from: tables.deployment.validFrom,
      valid_to: tables.deployment.validTo,
      created_at: isoTimestamp(tables.deployment.createdAt),
      updated_at: isoTimestamp(tables.deployment.updatedAt),
    })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.technologyProduct.supplierId))
    .where(eq(tables.deployment.id, id))
  const record = rows[0]
  if (!record) return null

  const [evidence, reviews, revisions] = await Promise.all([
    db
      .select({
        url: tables.evidence.url,
        source_type: tables.evidence.sourceType,
        publisher: tables.evidence.publisher,
        published_date: tables.evidence.publishedDate,
      })
      .from(tables.evidence)
      .where(eq(tables.evidence.deploymentId, id))
      .orderBy(asc(tables.evidence.id)),
    db
      .select({
        decision: tables.verificationReview.decision,
        note: tables.verificationReview.reviewNote,
        administrator: tables.adminUser.email,
        reviewed_at: isoTimestamp(tables.verificationReview.reviewedAt),
      })
      .from(tables.verificationReview)
      .innerJoin(tables.adminUser, eq(tables.adminUser.id, tables.verificationReview.adminUserId))
      .where(eq(tables.verificationReview.deploymentId, id))
      .orderBy(asc(tables.verificationReview.reviewedAt), asc(tables.verificationReview.id)),
    db
      .select({
        action: tables.revision.action,
        previous_values: sql<Record<string, unknown> | null>`${tables.revision.previousValues}`,
        change_note: tables.revision.changeNote,
        contributor_email: tables.contributor.email,
        contributor_organisation: tables.contributor.organisation,
        administrator: tables.adminUser.email,
        changed_at: isoTimestamp(tables.revision.changedAt),
      })
      .from(tables.revision)
      .leftJoin(tables.contributor, eq(tables.contributor.id, tables.revision.contributorId))
      .leftJoin(tables.adminUser, eq(tables.adminUser.id, tables.revision.adminUserId))
      .where(eq(tables.revision.deploymentId, id))
      .orderBy(asc(tables.revision.changedAt), asc(tables.revision.id)),
  ])
  return { ...record, evidence, reviews, revisions }
}

/** Locks the record for a decision and returns what the decision rules need. */
export async function lockDecisionState(tx: Tx, id: number): Promise<{
  verificationStatus: string
  technologyProductId: number | null
  evidenceCount: number
} | null> {
  const rows = await tx.db
    .select({
      verificationStatus: tables.deployment.verificationStatus,
      technologyProductId: tables.deployment.technologyProductId,
      evidenceCount,
    })
    .from(tables.deployment)
    .where(eq(tables.deployment.id, id))
    .for('update')
  return rows[0] ?? null
}

export async function insertReview(tx: Tx, review: {
  deploymentId: number
  adminUserId: number
  decision: string
  note: string | null
}): Promise<number> {
  const rows = await tx.db
    .insert(tables.verificationReview)
    .values({
      deploymentId: review.deploymentId,
      adminUserId: review.adminUserId,
      // Validated against the controlled values upstream; the database enum still rejects anything else
      decision: review.decision as (typeof tables.verificationReview.$inferInsert)['decision'],
      reviewNote: review.note,
    })
    .returning({ id: tables.verificationReview.id })
  const row = rows[0]
  if (!row) throw new Error('Inserting the verification review returned no row')
  return row.id
}

export async function setVerificationStatus(tx: Tx, id: number, status: string): Promise<void> {
  await tx.db
    .update(tables.deployment)
    // Statuses come from the decision map in the moderation service
    .set({ verificationStatus: status as (typeof tables.deployment.$inferInsert)['verificationStatus'] })
    .where(eq(tables.deployment.id, id))
}

/** Supplier and product names of a technology product, for revision history. */
export async function findTechnologyNames(tx: Tx, productId: number | null): Promise<{ supplier: string; product: string } | null> {
  if (productId === null) return null
  const rows = await tx.db
    .select({ supplier: tables.company.name, product: tables.technologyProduct.productName })
    .from(tables.technologyProduct)
    .innerJoin(tables.company, eq(tables.company.id, tables.technologyProduct.supplierId))
    .where(eq(tables.technologyProduct.id, productId))
  return rows[0] ?? null
}
