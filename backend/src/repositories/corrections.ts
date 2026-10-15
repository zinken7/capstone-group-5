import { eq, sql } from 'drizzle-orm'

import { db } from '../database.js'

import type { Tx } from '../database.js'
import * as tables from '../db/schema.js'

export type CorrectionStatus = (typeof tables.correctionStatus.enumValues)[number]

/** Stores a correction to a verified deployment as a proposal; the deployment row is not touched. */
export async function insertCorrection(tx: Tx, correction: {
  deploymentId: number
  contributorId: number | null
  proposedValues: Record<string, unknown>
  baseValues: Record<string, unknown>
  evidenceUrls: string[]
  changeNote: string | null
}): Promise<number> {
  const rows = await tx.db
    .insert(tables.deploymentCorrection)
    .values(correction)
    .returning({ id: tables.deploymentCorrection.id })
  const row = rows[0]
  if (!row) throw new Error('Inserting the correction returned no row')
  return row.id
}

export interface LockedCorrection {
  id: number
  deploymentId: number
  contributorId: number | null
  proposedValues: Record<string, unknown>
  evidenceUrls: string[]
  changeNote: string | null
  status: CorrectionStatus
}

/** Reads a correction and locks it until the transaction ends, so it is decided once. */
export async function lockCorrection(tx: Tx, id: number): Promise<LockedCorrection | null> {
  const rows = await tx.db
    .select({
      id: tables.deploymentCorrection.id,
      deploymentId: tables.deploymentCorrection.deploymentId,
      contributorId: tables.deploymentCorrection.contributorId,
      proposedValues: tables.deploymentCorrection.proposedValues,
      evidenceUrls: tables.deploymentCorrection.evidenceUrls,
      changeNote: tables.deploymentCorrection.changeNote,
      status: tables.deploymentCorrection.status,
    })
    .from(tables.deploymentCorrection)
    .where(eq(tables.deploymentCorrection.id, id))
    .for('update')
  const row = rows[0]
  return row ? { ...row, proposedValues: row.proposedValues as Record<string, unknown> } : null
}

export async function setCorrectionStatus(tx: Tx, id: number, status: CorrectionStatus): Promise<void> {
  await tx.db
    .update(tables.deploymentCorrection)
    .set({ status })
    .where(eq(tables.deploymentCorrection.id, id))
}

/** Stores the hash of a new proposal's private key (FR-59, #223); the key itself is never stored. */
export async function insertCorrectionKey(tx: Tx, correctionId: number, keyHash: string): Promise<void> {
  await tx.db.insert(tables.correctionKey).values({ correctionId, keyHash })
}

// A type alias, not an interface, so it satisfies db.execute's row constraint
export type CorrectionTrackingRow = {
  id: number
  deployment_id: number
  key_hash: string
  status: string
  submitted_at: string
  change_note: string | null
  evidence_urls: string[]
  proposed_values: Record<string, unknown>
  base_values: Record<string, unknown>
  site_id: number
  site_name: string
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  decision: string | null
  decision_note: string | null
  decided_at: string | null
}

/** Proposals that hold a key, by id, with their key hash for the caller to check and the latest decision on each. */
export async function findCorrectionsForTracking(ids: readonly number[]): Promise<CorrectionTrackingRow[]> {
  if (ids.length === 0) return []
  const result = await db.execute<CorrectionTrackingRow>(sql`
    SELECT c.id::int AS id, c.deployment_id::int AS deployment_id, k.key_hash, c.status::text AS status,
      to_char(c.submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS submitted_at,
      c.change_note, c.evidence_urls, c.proposed_values, c.base_values,
      s.id::int AS site_id, s.name AS site_name, maker.name AS machine_manufacturer,
      mm.model_name AS machine_model, mm.machine_type::text AS machine_type,
      vr.decision::text AS decision, vr.review_note AS decision_note,
      to_char(vr.reviewed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS decided_at
    FROM ${tables.deploymentCorrection} c
    JOIN ${tables.correctionKey} k ON k.correction_id = c.id
    JOIN ${tables.deployment} d ON d.id = c.deployment_id
    JOIN ${tables.site} s ON s.id = d.site_id
    JOIN ${tables.machineModel} mm ON mm.id = d.machine_model_id
    JOIN ${tables.company} maker ON maker.id = mm.manufacturer_id
    LEFT JOIN LATERAL (
      SELECT v.decision, v.review_note, v.reviewed_at FROM ${tables.verificationReview} v
      WHERE v.correction_id = c.id ORDER BY v.reviewed_at DESC, v.id DESC LIMIT 1
    ) vr ON TRUE
    WHERE c.id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
    ORDER BY c.id
  `)
  return result.rows
}
