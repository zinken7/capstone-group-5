import { and, asc, eq, inArray, isNull, sql, ne, or } from 'drizzle-orm'
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
  /**
   * A submission is a record pending review: new, or returned to the queue by a
   * contributor's direct correction (kind "correction", correction_id null).
   * A proposed correction to a verified record has its correction_id.
   */
  kind: 'submission' | 'correction'
  correction_id: number | null
  /** API field names changed by the correction; empty for a new submission. */
  changed_fields: string[]
  contributor_email: string | null
  contributor_organisation: string | null
}

/** Records waiting for a decision, least recently changed first. */
export async function listPendingSubmissions(): Promise<QueueItem[]> {
  const items = await db
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
    .leftJoin(supplier, eq(supplier.id, tables.deployment.technologySupplierId))
    .where(eq(tables.deployment.verificationStatus, 'pending_review'))
    .orderBy(asc(tables.deployment.updatedAt), asc(tables.deployment.id))

  if (items.length === 0) return []

  // Queue metadata comes from the latest contributor revision: the submission
  // itself, or a correction that returned the record to the queue. An
  // administrator's own edits and decisions do not change what the item is.
  const revisions = await db
    .select({
      deployment_id: tables.revision.deploymentId,
      action: tables.revision.action,
      previous_values: sql<Record<string, unknown> | null>`${tables.revision.previousValues}`,
      contributor_email: tables.contributor.email,
      contributor_organisation: tables.contributor.organisation,
    })
    .from(tables.revision)
    .leftJoin(tables.contributor, eq(tables.contributor.id, tables.revision.contributorId))
    .where(and(
      inArray(tables.revision.deploymentId, items.map((item) => item.id)),
      inArray(tables.revision.action, ['create', 'update']),
      isNull(tables.revision.adminUserId),
    ))
    .orderBy(asc(tables.revision.changedAt), asc(tables.revision.id))

  const latestByDeployment = new Map<number, (typeof revisions)[number]>()
  for (const revision of revisions) latestByDeployment.set(revision.deployment_id, revision)

  return items.map((item) => {
    const revision = latestByDeployment.get(item.id)
    const changedFields = revision?.action === 'update' && revision.previous_values
      ? Object.keys(revision.previous_values).filter((field) => field !== 'verification_status')
      : []
    return {
      ...item,
      kind: revision?.action === 'update' ? 'correction' : 'submission',
      correction_id: null,
      changed_fields: changedFields,
      contributor_email: revision?.contributor_email ?? null,
      contributor_organisation: revision?.contributor_organisation ?? null,
    }
  })
}

/** Proposed corrections to verified records, oldest first; the record fields are its current values. */
export async function listPendingCorrections(): Promise<QueueItem[]> {
  const rows = await db
    .select({
      id: tables.deployment.id,
      correction_id: tables.deploymentCorrection.id,
      site_name: tables.site.name,
      country_code: tables.site.countryCode,
      region: tables.region.name,
      machine_manufacturer: manufacturer.name,
      machine_model: tables.machineModel.modelName,
      machine_type: tables.machineModel.machineType,
      quantity: tables.deployment.quantity,
      technology_supplier: supplier.name,
      technology_product: tables.technologyProduct.productName,
      // The sources supplied with the correction, not the record's existing evidence
      evidence_count: sql<number>`cardinality(${tables.deploymentCorrection.evidenceUrls})`,
      submitted_at: isoTimestamp(tables.deploymentCorrection.submittedAt),
      proposed_values: sql<Record<string, unknown>>`${tables.deploymentCorrection.proposedValues}`,
      contributor_email: tables.contributor.email,
      contributor_organisation: tables.contributor.organisation,
    })
    .from(tables.deploymentCorrection)
    .innerJoin(tables.deployment, eq(tables.deployment.id, tables.deploymentCorrection.deploymentId))
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .leftJoin(tables.region, eq(tables.region.id, tables.site.regionId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
    .leftJoin(supplier, eq(supplier.id, tables.deployment.technologySupplierId))
    .leftJoin(tables.contributor, eq(tables.contributor.id, tables.deploymentCorrection.contributorId))
    .where(eq(tables.deploymentCorrection.status, 'pending'))
    .orderBy(asc(tables.deploymentCorrection.submittedAt), asc(tables.deploymentCorrection.id))
  return rows.map(({ proposed_values, ...row }) => ({
    ...row,
    kind: 'correction',
    changed_fields: [...Object.keys(proposed_values), ...(row.evidence_count > 0 ? ['evidence_urls'] : [])],
  }))
}

export interface ReviewRecord {
  id: number
  verification_status: string
  site_id: number
  site_name: string
  country_code: string
  latitude: number | null
  longitude: number | null
  region: string | null
  commodity: string | null
  machine_manufacturer: string
  machine_model: string | null
  model_variant: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  possible_duplicates: {
    id: number
    verification_status: string
    machine_manufacturer: string
    machine_model: string | null
    machine_type: string
    technology_product: string | null
    quantity: number
    commissioning_date: string | null
    status: string | null
  }[]
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
  reviews: { decision: string; note: string | null; administrator: string; reviewed_at: string; correction_id: number | null }[]
  corrections: CorrectionView[]
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

export interface CorrectionView {
  id: number
  status: string
  submitted_at: string
  contributor_email: string | null
  contributor_organisation: string | null
  change_note: string | null
  evidence_urls: string[]
  /** before: when the correction was submitted; current: the record now, which differs if it changed since. */
  changes: { field: string; before: unknown; proposed: unknown; current: unknown }[]
}

type RecordFields = Omit<ReviewRecord, 'evidence' | 'reviews' | 'revisions' | 'corrections' | 'possible_duplicates'>

/** A record's current value for each field a correction can propose, in the stored proposal format. */
function currentValue(record: RecordFields, field: string): unknown {
  switch (field) {
    case 'quantity': return record.quantity
    case 'environment': return record.environment
    case 'deployment_status': return record.status
    case 'automation_level': return record.automation_level
    case 'installation_type': return record.installation_type
    case 'commissioning_date': return record.commissioning_date ?? record.commissioning_year?.toString() ?? null
    default: return null
  }
}

/** One record in any verification status, with its evidence, corrections and full history. */
export async function findReviewRecord(id: number): Promise<ReviewRecord | null> {
  const rows = await db
    .select({
      id: tables.deployment.id,
      verification_status: tables.deployment.verificationStatus,
      machine_model_id: tables.deployment.machineModelId,
      technology_product_id: tables.deployment.technologyProductId,
      technology_supplier_id: tables.deployment.technologySupplierId,
      site_id: tables.site.id,
      site_name: tables.site.name,
      country_code: tables.site.countryCode,
      latitude: sql<number | null>`ST_Y(${tables.site.point4326})`,
      longitude: sql<number | null>`ST_X(${tables.site.point4326})`,
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
    .leftJoin(supplier, eq(supplier.id, tables.deployment.technologySupplierId))
    .where(eq(tables.deployment.id, id))
  const record = rows[0]
  if (!record) return null

  const possible_duplicates = await db
      .select({
        id: tables.deployment.id,
        verification_status: tables.deployment.verificationStatus,
        machine_manufacturer: manufacturer.name,
        machine_model: tables.machineModel.modelName,
        machine_type: tables.machineModel.machineType,
        technology_product: tables.technologyProduct.productName,
        quantity: tables.deployment.quantity,
        commissioning_date: tables.deployment.commissioningDate,
        status: tables.deployment.status,
      })
      .from(tables.deployment)
      .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
      .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
      .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
      .leftJoin(tables.technologyProduct, eq(tables.technologyProduct.id, tables.deployment.technologyProductId))
      .where(and(
        ne(tables.deployment.id, id),
        eq(tables.deployment.siteId, record.site_id),
        eq(tables.deployment.technologySupplierId, record.technology_supplier_id),
        inArray(tables.deployment.verificationStatus, ['pending_review', 'verified']),
        or(
          eq(tables.deployment.machineModelId, record.machine_model_id),
          eq(tables.machineModel.machineType, record.machine_type),
        ),
      ))
      .orderBy(asc(tables.deployment.id))


  const [evidence, reviews, revisions, corrections] = await Promise.all([
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
        correction_id: tables.verificationReview.correctionId,
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
    db
      .select({
        id: tables.deploymentCorrection.id,
        status: tables.deploymentCorrection.status,
        submitted_at: isoTimestamp(tables.deploymentCorrection.submittedAt),
        contributor_email: tables.contributor.email,
        contributor_organisation: tables.contributor.organisation,
        change_note: tables.deploymentCorrection.changeNote,
        evidence_urls: tables.deploymentCorrection.evidenceUrls,
        proposed_values: sql<Record<string, unknown>>`${tables.deploymentCorrection.proposedValues}`,
        base_values: sql<Record<string, unknown>>`${tables.deploymentCorrection.baseValues}`,
      })
      .from(tables.deploymentCorrection)
      .leftJoin(tables.contributor, eq(tables.contributor.id, tables.deploymentCorrection.contributorId))
      .where(eq(tables.deploymentCorrection.deploymentId, id))
      .orderBy(asc(tables.deploymentCorrection.submittedAt), asc(tables.deploymentCorrection.id)),
  ])
  const publicRecord = Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => key !== 'machine_model_id' && key !== 'technology_product_id' && key !== 'technology_supplier_id',
    ),
  ) as Omit<typeof record, 'machine_model_id' | 'technology_product_id' | 'technology_supplier_id'>
  return {
    ...publicRecord,
    possible_duplicates,
    evidence,
    reviews,
    revisions,
    corrections: corrections.map(({ proposed_values, base_values, ...correction }) => ({
      ...correction,
      changes: Object.entries(proposed_values).map(([field, proposed]) => ({
        field,
        before: base_values[field] ?? null,
        proposed,
        current: currentValue(record, field),
      })),
    })),
  }
}

/** Locks the record for a decision and returns what the decision rules need. */
export async function lockDecisionState(tx: Tx, id: number): Promise<{
  verificationStatus: string
  evidenceCount: number
  hasCoordinates: boolean
} | null> {
  const rows = await tx.db
    .select({
      verificationStatus: tables.deployment.verificationStatus,
      evidenceCount,
      hasCoordinates: sql<boolean>`${tables.site.point4326} IS NOT NULL`,
    })
    .from(tables.deployment)
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .where(eq(tables.deployment.id, id))
    .for('update')
  return rows[0] ?? null
}

export async function insertReview(tx: Tx, review: {
  deploymentId: number
  adminUserId: number
  decision: string
  note: string | null
  /** Set when the decision is on a proposed correction rather than the record itself. */
  correctionId?: number | null
}): Promise<number> {
  const rows = await tx.db
    .insert(tables.verificationReview)
    .values({
      deploymentId: review.deploymentId,
      adminUserId: review.adminUserId,
      // Validated against the controlled values upstream; the database enum still rejects anything else
      decision: review.decision as (typeof tables.verificationReview.$inferInsert)['decision'],
      reviewNote: review.note,
      correctionId: review.correctionId ?? null,
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
export async function findTechnologyNames(tx: Tx, supplierId: number, productId: number | null): Promise<{ supplier: string; product: string | null }> {
  const rows = await tx.db
    .select({ supplier: tables.company.name, product: tables.technologyProduct.productName })
    .from(tables.company)
    .leftJoin(tables.technologyProduct, and(
      eq(tables.technologyProduct.supplierId, tables.company.id),
      productId === null ? sql`false` : eq(tables.technologyProduct.id, productId),
    ))
    .where(eq(tables.company.id, supplierId))
  const row = rows[0]
  if (!row) throw new Error(`Supplier ${supplierId} not found`)
  return row
}
