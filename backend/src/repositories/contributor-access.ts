import { asc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '../database.js'
import type { Tx } from '../database.js'
import * as tables from '../db/schema.js'
import { isoTimestamp } from '../lib/iso-timestamp.js'

const manufacturer = alias(tables.company, 'manufacturer')

/**
 * The latest decision on the record itself, as the contributor reads it (FR-59).
 * Decisions on proposed corrections (correction_id set) are not the contributor's.
 */
function latestDecision<T>(expression: string) {
  return sql<T>`(
    SELECT ${sql.raw(expression)}
    FROM ${tables.verificationReview} vr
    WHERE vr.deployment_id = ${tables.deployment.id} AND vr.correction_id IS NULL
    ORDER BY vr.reviewed_at DESC, vr.id DESC
    LIMIT 1
  )`
}

const summaryColumns = {
  id: tables.deployment.id,
  key_hash: tables.contributionKey.keyHash,
  verification_status: tables.deployment.verificationStatus,
  site_id: tables.site.id,
  site_name: tables.site.name,
  country_code: tables.site.countryCode,
  machine_manufacturer: manufacturer.name,
  machine_model: tables.machineModel.modelName,
  machine_type: tables.machineModel.machineType,
  quantity: tables.deployment.quantity,
  submitted_at: isoTimestamp(tables.deployment.createdAt),
  updated_at: isoTimestamp(tables.deployment.updatedAt),
  decision: latestDecision<string | null>('vr.decision::text'),
  decision_note: latestDecision<string | null>('vr.review_note'),
  decided_at: latestDecision<string | null>(`to_char(vr.reviewed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}

export interface ContributionSummaryRow {
  id: number
  key_hash: string
  verification_status: string
  site_id: number
  site_name: string
  country_code: string
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  quantity: number
  submitted_at: string
  updated_at: string
  decision: string | null
  decision_note: string | null
  decided_at: string | null
}

/** Submissions that hold a key, by id, with their key hash for the caller to check. */
export async function findContributionSummaries(ids: readonly number[]): Promise<ContributionSummaryRow[]> {
  if (ids.length === 0) return []
  return db
    .select(summaryColumns)
    .from(tables.deployment)
    .innerJoin(tables.contributionKey, eq(tables.contributionKey.deploymentId, tables.deployment.id))
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .where(inArray(tables.deployment.id, [...ids]))
    .orderBy(asc(tables.deployment.id))
}

export interface ContributionDetailRow extends ContributionSummaryRow {
  latitude: number | null
  longitude: number | null
  environment: string | null
  deployment_status: string | null
  automation_level: string
  installation_type: string
  commissioning_date: string | null
  commissioning_year: number | null
  evidence_urls: string[]
}

/** One submission that holds a key, with the values its update form needs. */
export async function findContributionDetail(id: number): Promise<ContributionDetailRow | null> {
  const rows = await db
    .select({
      ...summaryColumns,
      latitude: sql<number | null>`ST_Y(${tables.site.point4326})`,
      longitude: sql<number | null>`ST_X(${tables.site.point4326})`,
      environment: tables.deployment.environment,
      deployment_status: tables.deployment.status,
      automation_level: tables.deployment.automationLevel,
      installation_type: tables.deployment.installationType,
      commissioning_date: tables.deployment.commissioningDate,
      commissioning_year: tables.deployment.commissioningYear,
    })
    .from(tables.deployment)
    .innerJoin(tables.contributionKey, eq(tables.contributionKey.deploymentId, tables.deployment.id))
    .innerJoin(tables.site, eq(tables.site.id, tables.deployment.siteId))
    .innerJoin(tables.machineModel, eq(tables.machineModel.id, tables.deployment.machineModelId))
    .innerJoin(manufacturer, eq(manufacturer.id, tables.machineModel.manufacturerId))
    .where(eq(tables.deployment.id, id))
  const row = rows[0]
  if (!row) return null
  const evidence = await db
    .select({ url: tables.evidence.url })
    .from(tables.evidence)
    .where(eq(tables.evidence.deploymentId, id))
    .orderBy(asc(tables.evidence.id))
  return { ...row, evidence_urls: evidence.map((item) => item.url) }
}

/** The stored key hash of a submission, read inside the transaction that holds its row lock. */
export async function findKeyHash(tx: Tx, deploymentId: number): Promise<string | null> {
  const rows = await tx.db
    .select({ keyHash: tables.contributionKey.keyHash })
    .from(tables.contributionKey)
    .where(eq(tables.contributionKey.deploymentId, deploymentId))
  return rows[0]?.keyHash ?? null
}

/** The contributor row of the original submission, so a later update is attributed to the same person. */
export async function findSubmitter(tx: Tx, deploymentId: number): Promise<number | null> {
  const rows = await tx.db
    .select({ contributorId: tables.revision.contributorId })
    .from(tables.revision)
    .where(sql`${tables.revision.deploymentId} = ${deploymentId} AND ${tables.revision.action} = 'create'`)
    .orderBy(asc(tables.revision.id))
    .limit(1)
  return rows[0]?.contributorId ?? null
}
