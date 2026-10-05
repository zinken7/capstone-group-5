import { withTransaction } from '../database.js'
import type { AdminCorrectionInput, ReviewDecision, ReviewInput } from '../lib/admin-validation.js'
import {
  findEvidenceUrls,
  findOrCreateCompany,
  findOrCreateTechnologyProduct,
  insertEvidence,
  insertRevision,
  lockDeployment,
  updateDeploymentForReview,
} from '../repositories/contributions.js'
import {
  findReviewRecord,
  findTechnologyNames,
  insertReview,
  listPendingReviews,
  lockDecisionState,
  setVerificationStatus,
} from '../repositories/moderation.js'
import type { QueueItem, ReviewRecord } from '../repositories/moderation.js'
import { diffChanges } from './corrections.js'

/** Verification status after each decision. A record that needs changes leaves the queue until a correction returns it. */
const STATUS_AFTER: Record<ReviewDecision, string> = {
  approved: 'verified',
  rejected: 'rejected',
  needs_changes: 'unverified',
}

export function listQueue(): Promise<QueueItem[]> {
  return listPendingReviews()
}

export function getReviewRecord(id: number): Promise<ReviewRecord | null> {
  return findReviewRecord(id)
}

export type DecisionOutcome =
  | { kind: 'not_found' }
  | { kind: 'not_pending'; verificationStatus: string }
  | { kind: 'missing_technology_product' }
  | { kind: 'missing_evidence' }
  | { kind: 'decided'; reviewId: number; verificationStatus: string }

/**
 * Records a decision on a record pending review: the review row, the new
 * verification status and a verification_change revision commit together or not at all.
 */
export async function decide(deploymentId: number, adminUserId: number, input: ReviewInput): Promise<DecisionOutcome> {
  return withTransaction(async (tx) => {
    const state = await lockDecisionState(tx, deploymentId)
    if (!state) return { kind: 'not_found' }
    if (state.verificationStatus !== 'pending_review') {
      return { kind: 'not_pending', verificationStatus: state.verificationStatus }
    }
    // The database enforces both rules too; checking first gives a clear answer
    if (input.decision === 'approved') {
      if (state.technologyProductId === null) return { kind: 'missing_technology_product' }
      if (state.evidenceCount === 0) return { kind: 'missing_evidence' }
    }

    const verificationStatus = STATUS_AFTER[input.decision]
    const reviewId = await insertReview(tx, { deploymentId, adminUserId, decision: input.decision, note: input.note })
    await setVerificationStatus(tx, deploymentId, verificationStatus)
    await insertRevision(tx, {
      deploymentId,
      contributorId: null,
      adminUserId,
      action: 'verification_change',
      previousValues: { verification_status: state.verificationStatus },
      changeNote: input.note,
    })
    return { kind: 'decided', reviewId, verificationStatus }
  })
}

export type AdminCorrectionOutcome =
  | { kind: 'not_found' }
  | { kind: 'unchanged' }
  | { kind: 'updated'; id: number; verificationStatus: string }

/** Applies an administrator's correction, keeping the previous values and the verification status. */
export async function correctAsAdministrator(id: number, adminUserId: number, input: AdminCorrectionInput): Promise<AdminCorrectionOutcome> {
  return withTransaction(async (tx) => {
    const current = await lockDeployment(tx, id)
    if (!current) return { kind: 'not_found' }

    const { previous, updates } = diffChanges(current, input.changes)

    if (input.technology) {
      const supplierId = await findOrCreateCompany(tx, input.technology.supplier)
      const productId = await findOrCreateTechnologyProduct(tx, supplierId, input.technology.product)
      if (productId !== current.technologyProductId) {
        const before = await findTechnologyNames(tx, current.technologyProductId)
        previous.technology_supplier = before?.supplier ?? null
        previous.technology_product = before?.product ?? null
        updates.technology_product_id = productId
      }
    }

    const existingUrls = await findEvidenceUrls(tx, id)
    const newUrls = input.evidenceUrls.filter((url) => !existingUrls.includes(url))
    if (newUrls.length > 0) previous.evidence_urls = existingUrls

    if (Object.keys(previous).length === 0) return { kind: 'unchanged' }

    await insertRevision(tx, {
      deploymentId: id,
      contributorId: null,
      adminUserId,
      action: 'update',
      previousValues: previous,
      changeNote: input.changeNote,
    })
    const verificationStatus = await updateDeploymentForReview(tx, id, updates, { returnToPending: false })
    await insertEvidence(tx, id, newUrls)

    return { kind: 'updated', id, verificationStatus }
  })
}
