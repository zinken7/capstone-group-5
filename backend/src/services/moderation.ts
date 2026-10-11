import { withTransaction } from '../database.js'
import type { Tx } from '../database.js'
import type { AdminCorrectionInput, ReviewDecision, ReviewInput } from '../lib/admin-validation.js'
import {
  findEvidenceUrls,
  findOrCreateCompany,
  findOrCreateTechnologyProduct,
  insertEvidence,
  insertRevision,
  lockDeployment,
  updateSiteCoordinates,
  updateDeploymentForReview,
} from '../repositories/contributions.js'
import { lockCorrection, setCorrectionStatus } from '../repositories/corrections.js'
import type { CorrectionStatus, LockedCorrection } from '../repositories/corrections.js'
import type { CurrentDeployment } from '../repositories/contributions.js'
import {
  findReviewRecord,
  findTechnologyNames,
  insertReview,
  listPendingCorrections,
  listPendingSubmissions,
  listSubmissionHistory,
  lockDecisionState,
  setVerificationStatus,
} from '../repositories/moderation.js'
import type { QueueItem, ReviewRecord } from '../repositories/moderation.js'
import { changesFromProposed, diffChanges } from './corrections.js'

/** Verification status after each decision. A record that needs changes leaves the queue until a correction returns it. */
const STATUS_AFTER: Record<ReviewDecision, string> = {
  approved: 'verified',
  rejected: 'rejected',
  needs_changes: 'unverified',
}

/** Submissions and proposed corrections together, oldest first. */
export async function listQueue(): Promise<QueueItem[]> {
  const [submissions, corrections] = await Promise.all([listPendingSubmissions(), listPendingCorrections()])
  return [...submissions, ...corrections].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
}

/** Lists submission history for administrator discovery. */
export function getSubmissionHistory(
  limit: number,
  offset: number,
  deploymentId?: number,
) {
  return listSubmissionHistory(limit, offset, deploymentId)
}
export function getReviewRecord(id: number): Promise<ReviewRecord | null> {
  return findReviewRecord(id)
}

export type DecisionOutcome =
  | { kind: 'not_found' }
  | { kind: 'not_pending'; verificationStatus: string }
  | { kind: 'missing_technology_product' }
  | { kind: 'missing_evidence' }
  | { kind: 'missing_coordinates' }
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
      if (!state.hasCoordinates) return { kind: 'missing_coordinates' }
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

const CORRECTION_STATUS_AFTER: Record<ReviewDecision, CorrectionStatus> = {
  approved: 'approved',
  rejected: 'rejected',
  needs_changes: 'needs_changes',
}

export type CorrectionDecisionOutcome =
  | { kind: 'not_found' }
  | { kind: 'not_pending'; correctionStatus: string }
  | { kind: 'decided'; reviewId: number; correctionStatus: string; verificationStatus: string }

/**
 * Decides a proposed correction (#114). Approval applies it to the record,
 * attributed to its contributor, and keeps the record verified; rejecting it
 * or asking for changes leaves the record as it is. The review row records
 * the decision against the correction.
 */
export async function decideCorrection(correctionId: number, adminUserId: number, input: ReviewInput): Promise<CorrectionDecisionOutcome> {
  return withTransaction(async (tx) => {
    const correction = await lockCorrection(tx, correctionId)
    if (!correction) return { kind: 'not_found' }
    if (correction.status !== 'pending') return { kind: 'not_pending', correctionStatus: correction.status }

    const current = await lockDeployment(tx, correction.deploymentId)
    // The foreign key guarantees the deployment exists
    if (!current) throw new Error(`Correction ${correctionId} has no deployment`)

    if (input.decision === 'approved') await applyCorrection(tx, correction, current)
    const reviewId = await insertReview(tx, {
      deploymentId: correction.deploymentId,
      adminUserId,
      decision: input.decision,
      note: input.note,
      correctionId,
    })
    const correctionStatus = CORRECTION_STATUS_AFTER[input.decision]
    await setCorrectionStatus(tx, correctionId, correctionStatus)
    return { kind: 'decided', reviewId, correctionStatus, verificationStatus: current.verificationStatus }
  })
}

/** Applies an approved correction against the record as it is now, keeping the previous values (FR-47). */
async function applyCorrection(tx: Tx, correction: LockedCorrection, current: CurrentDeployment): Promise<void> {
  const { previous, updates } = diffChanges(current, changesFromProposed(correction.proposedValues))
  const existingUrls = await findEvidenceUrls(tx, current.id)
  const newUrls = correction.evidenceUrls.filter((url) => !existingUrls.includes(url))
  if (newUrls.length > 0) previous.evidence_urls = existingUrls
  // The record may already hold these values, for example after an administrator's edit
  if (Object.keys(previous).length === 0) return

  await insertRevision(tx, {
    deploymentId: current.id,
    contributorId: correction.contributorId,
    action: 'update',
    previousValues: previous,
    changeNote: correction.changeNote,
  })
  await updateDeploymentForReview(tx, current.id, updates, { returnToPending: false })
  await insertEvidence(tx, current.id, newUrls)
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

    if (input.coordinates && (input.coordinates.latitude !== current.siteLatitude || input.coordinates.longitude !== current.siteLongitude)) {
      previous.latitude = current.siteLatitude
      previous.longitude = current.siteLongitude
    }

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
    if (input.coordinates && (input.coordinates.latitude !== current.siteLatitude || input.coordinates.longitude !== current.siteLongitude)) {
      await updateSiteCoordinates(tx, current.siteId, input.coordinates)
    }
    await insertEvidence(tx, id, newUrls)

    return { kind: 'updated', id, verificationStatus }
  })
}
