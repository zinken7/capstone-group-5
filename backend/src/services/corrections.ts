import { withTransaction } from '../database.js'
import type { CorrectionInput } from '../lib/correction-validation.js'
import {
  findEvidenceUrls,
  insertContributor,
  insertEvidence,
  insertRevision,
  lockDeployment,
  updateDeploymentForReview,
} from '../repositories/contributions.js'
import type { CorrectableColumn } from '../repositories/contributions.js'

export type CorrectionOutcome =
  | { kind: 'not_found' }
  | { kind: 'unchanged' }
  | { kind: 'updated'; id: number; verificationStatus: string }

/**
 * Applies a public correction: previous values go into an update revision first (FR-47),
 * then the deployment changes and returns to pending review (FR-48).
 */
export async function correctDeployment(id: number, input: CorrectionInput): Promise<CorrectionOutcome> {
  return withTransaction(async (tx) => {
    const current = await lockDeployment(tx, id)
    if (!current) return { kind: 'not_found' }

    const previous: Record<string, unknown> = {}
    const updates: Partial<Record<CorrectableColumn, unknown>> = {}
    const compare = (field: string, column: CorrectableColumn, next: unknown, before: unknown) => {
      if (next !== undefined && next !== before) {
        previous[field] = before
        updates[column] = next
      }
    }

    const { changes } = input
    compare('quantity', 'quantity', changes.quantity, current.quantity)
    compare('environment', 'environment', changes.environment, current.environment)
    compare('deployment_status', 'status', changes.status, current.status)
    compare('automation_level', 'automation_level', changes.automationLevel, current.automationLevel)
    compare('installation_type', 'installation_type', changes.installationType, current.installationType)

    const commissioning = changes.commissioning
    if (commissioning && (commissioning.date !== current.commissioningDate || commissioning.year !== current.commissioningYear)) {
      previous.commissioning_date = current.commissioningDate ?? current.commissioningYear?.toString() ?? null
      updates.commissioning_date = commissioning.date
      updates.commissioning_year = commissioning.year
    }

    const existingUrls = await findEvidenceUrls(tx, id)
    const newUrls = input.evidenceUrls.filter((url) => !existingUrls.includes(url))
    if (newUrls.length > 0) previous.evidence_urls = existingUrls

    if (Object.keys(previous).length === 0) return { kind: 'unchanged' }
    previous.verification_status = current.verificationStatus

    const contributorId = input.contributorEmail === null && input.organisation === null
      ? null
      : await insertContributor(tx, { email: input.contributorEmail, organisation: input.organisation })

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
