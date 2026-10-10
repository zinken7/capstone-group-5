import { withTransaction } from '../database.js'
import type { CorrectionInput, DeploymentChanges } from '../lib/correction-validation.js'
import {
  findEvidenceUrls,
  insertContributor,
  insertEvidence,
  insertRevision,
  lockDeployment,
  updateDeploymentForReview,
} from '../repositories/contributions.js'
import type { CorrectableColumn, CurrentDeployment } from '../repositories/contributions.js'
import { insertCorrection } from '../repositories/corrections.js'

export type CorrectionOutcome =
  | { kind: 'not_found' }
  | { kind: 'unchanged' }
  | { kind: 'updated'; id: number; verificationStatus: string }
  | { kind: 'proposed'; id: number; correctionId: number; verificationStatus: string }

export interface ChangeSet {
  /** Previous values of the changed fields, by API field name, for the revision. */
  previous: Record<string, unknown>
  updates: Partial<Record<CorrectableColumn, unknown>>
}

/** Compares requested changes with the current record; unchanged fields are left out. */
export function diffChanges(current: CurrentDeployment, changes: DeploymentChanges): ChangeSet {
  const previous: Record<string, unknown> = {}
  const updates: Partial<Record<CorrectableColumn, unknown>> = {}
  const compare = (field: string, column: CorrectableColumn, next: unknown, before: unknown) => {
    if (next !== undefined && next !== before) {
      previous[field] = before
      updates[column] = next
    }
  }

  compare('quantity', 'quantity', changes.quantity, current.quantity)
  compare('environment', 'environment', changes.environment, current.environment)
  compare('deployment_status', 'status', changes.status, current.status)
  compare('automation_level', 'automation_level', changes.automationLevel, current.automationLevel)
  compare('installation_type', 'installation_type', changes.installationType, current.installationType)

  const commissioning = changes.commissioning
  if (commissioning && (commissioning.date !== current.commissioningDate || commissioning.year !== current.commissioningYear)) {
    previous.commissioning_date = commissioningValue(current.commissioningDate, current.commissioningYear)
    updates.commissioning_date = commissioning.date
    updates.commissioning_year = commissioning.year
  }

  return { previous, updates }
}

/** A commissioning date, or the year alone when only the year is known. */
export function commissioningValue(date: string | null, year: number | null): string | null {
  return date ?? year?.toString() ?? null
}

/** The proposed value of each field in a change set, keyed like ChangeSet.previous. */
function proposedValues(changes: DeploymentChanges, previous: Record<string, unknown>): Record<string, unknown> {
  const proposed: Record<string, unknown> = {
    quantity: changes.quantity,
    environment: changes.environment,
    deployment_status: changes.status,
    automation_level: changes.automationLevel,
    installation_type: changes.installationType,
    commissioning_date: changes.commissioning && commissioningValue(changes.commissioning.date, changes.commissioning.year),
  }
  return Object.fromEntries(Object.keys(previous).map((field) => [field, proposed[field]]))
}

/** Turns a stored proposal back into the changes diffChanges compares against the record. */
export function changesFromProposed(values: Record<string, unknown>): DeploymentChanges {
  const changes: DeploymentChanges = {}
  if (typeof values.quantity === 'number') changes.quantity = values.quantity
  if (typeof values.environment === 'string') changes.environment = values.environment
  if (typeof values.deployment_status === 'string') changes.status = values.deployment_status
  if (typeof values.automation_level === 'string') changes.automationLevel = values.automation_level
  if (typeof values.installation_type === 'string') changes.installationType = values.installation_type
  if (typeof values.commissioning_date === 'string') {
    const value = values.commissioning_date
    changes.commissioning = /^\d{4}$/.test(value)
      ? { date: null, year: Number(value) }
      : { date: value, year: Number(value.slice(0, 4)) }
  }
  return changes
}

/**
 * A correction to a verified record is stored as a proposal and the record
 * stays public until an administrator decides it (#114). Any other record is
 * corrected directly: the previous values go into an update revision (FR-47)
 * and the record returns to pending review.
 */
export async function correctDeployment(id: number, input: CorrectionInput): Promise<CorrectionOutcome> {
  return withTransaction(async (tx) => {
    const current = await lockDeployment(tx, id)
    if (!current) return { kind: 'not_found' }

    const { previous, updates } = diffChanges(current, input.changes)
    const existingUrls = await findEvidenceUrls(tx, id)
    const newUrls = input.evidenceUrls.filter((url) => !existingUrls.includes(url))
    if (Object.keys(previous).length === 0 && newUrls.length === 0) return { kind: 'unchanged' }

    // Each revision names exactly one actor, so an anonymous correction still gets a contributor row
    const contributorId = await insertContributor(tx, { email: input.contributorEmail, organisation: input.organisation })

    if (current.verificationStatus === 'verified') {
      const correctionId = await insertCorrection(tx, {
        deploymentId: id,
        contributorId,
        proposedValues: proposedValues(input.changes, previous),
        baseValues: previous,
        evidenceUrls: newUrls,
        changeNote: input.changeNote,
      })
      return { kind: 'proposed', id, correctionId, verificationStatus: current.verificationStatus }
    }

    if (newUrls.length > 0) previous.evidence_urls = existingUrls
    previous.verification_status = current.verificationStatus
    await insertRevision(tx, {
      deploymentId: id,
      contributorId,
      action: 'update',
      previousValues: previous,
      changeNote: input.changeNote,
    })
    const verificationStatus = await updateDeploymentForReview(tx, id, updates)
    await insertEvidence(tx, id, newUrls)

    return { kind: 'updated', id, verificationStatus }
  })
}
