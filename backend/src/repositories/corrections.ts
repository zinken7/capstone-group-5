import { eq } from 'drizzle-orm'

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
