import { withTransaction } from '../database.js'
import type { CorrectionInput, DeploymentChanges } from '../lib/correction-validation.js'
import {
  closeValidityToday,
  findEvidenceUrls,
  insertContributor,
  lockDeployment,
} from '../repositories/contributions.js'
import type { CorrectableColumn, CurrentDeployment } from '../repositories/contributions.js'
import { insertCorrection } from '../repositories/corrections.js'

export type CorrectionOutcome =
  | { kind: 'not_found' }
  | { kind: 'not_verified' }
  | { kind: 'unchanged' }
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
  compare('valid_from', 'valid_from', changes.validFrom, current.validFrom)
  compare('valid_to', 'valid_to', changes.validTo, current.validTo)

  const commissioning = changes.commissioning
  if (commissioning && (commissioning.date !== current.commissioningDate || commissioning.year !== current.commissioningYear)) {
    previous.commissioning_date = commissioningValue(current.commissioningDate, current.commissioningYear)
    updates.commissioning_date = commissioning.date
    updates.commissioning_year = commissioning.year
  }

  return { previous, updates }
}

/** Keeps the validity window in step with a change, so the map and the timeline follow it (#156). */
export function alignValidity(current: CurrentDeployment, { previous, updates }: ChangeSet): void {
  // A window that opened on the commissioning date moves with it; one set separately is left alone
  const linked = 'commissioning_date' in updates && updates.valid_from === undefined && current.validFrom === current.commissioningDate
  const next = updates.commissioning_date as string | null
  if (linked && next !== current.validFrom) {
    previous.valid_from = current.validFrom
    updates.valid_from = next
  }

  if (updates.status === 'decommissioned' && current.validTo === null && updates.valid_to === undefined) {
    previous.valid_to = null
    updates.valid_to = closeValidityToday(validityAfter(current, updates).from)
  }
}

/** The validity dates a change set leaves on the record; an end computed in SQL is not a plain date. */
function validityAfter(current: CurrentDeployment, updates: ChangeSet['updates']): { from: string | null; to: unknown } {
  return {
    from: 'valid_from' in updates ? updates.valid_from as string | null : current.validFrom,
    to: 'valid_to' in updates ? updates.valid_to : current.validTo,
  }
}

/** False when a change set would end the validity window before it starts. */
export function windowOrdered(current: CurrentDeployment, updates: ChangeSet['updates']): boolean {
  const { from, to } = validityAfter(current, updates)
  // The end set on decommissioning is never before the start, so only two plain dates can be out of order
  return from === null || typeof to !== 'string' || to >= from
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
 * refused: before verification only its contributor may change it (FR-46),
 * and nothing identifies the contributor until the submission key (#205).
 */
export async function correctDeployment(id: number, input: CorrectionInput): Promise<CorrectionOutcome> {
  return withTransaction(async (tx) => {
    const current = await lockDeployment(tx, id)
    if (!current) return { kind: 'not_found' }
    if (current.verificationStatus !== 'verified') return { kind: 'not_verified' }

    const { previous } = diffChanges(current, input.changes)
    const existingUrls = await findEvidenceUrls(tx, id)
    const newUrls = input.evidenceUrls.filter((url) => !existingUrls.includes(url))
    if (Object.keys(previous).length === 0 && newUrls.length === 0) return { kind: 'unchanged' }

    // Each revision names exactly one actor, so an anonymous correction still gets a contributor row
    const contributorId = await insertContributor(tx, { email: input.contributorEmail, organisation: input.organisation })
    const correctionId = await insertCorrection(tx, {
      deploymentId: id,
      contributorId,
      proposedValues: proposedValues(input.changes, previous),
      baseValues: previous,
      evidenceUrls: newUrls,
      changeNote: input.changeNote,
    })
    return { kind: 'proposed', id, correctionId, verificationStatus: current.verificationStatus }
  })
}
