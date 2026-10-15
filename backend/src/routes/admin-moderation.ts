import { Router } from 'express'

import { validateAdminCorrection, validateReview } from '../lib/admin-validation.js'
import { parseId } from '../lib/ids.js'
import { currentAdmin, requireAdmin } from '../middleware/require-admin.js'
import { SUBMISSION_HISTORY_SORTS, VERIFICATION_STATUSES } from '../repositories/moderation.js'
import type { SubmissionHistorySort } from '../repositories/moderation.js'
import type { VerificationStatus } from '../types.js'
import { correctAsAdministrator, decide, decideCorrection, getReviewRecord, getSubmissionHistory, listQueue } from '../services/moderation.js'

const router = Router()

router.get('/admin/reviews', ...requireAdmin(), async (_req, res, next) => {
  try {
    res.status(200).json({ items: await listQueue() })
  } catch (error) {
    next(error)
  }
})

router.get('/admin/submissions', ...requireAdmin(), async (req, res, next) => {
  const rawLimit = req.query.limit
  const rawOffset = req.query.offset
  const rawId = req.query.id

  const limit = rawLimit === undefined ? 50 : Number(rawLimit)
  const offset = rawOffset === undefined ? 0 : Number(rawOffset)
  const id = rawId === undefined ? undefined : parseId(rawId)

  if (
    !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
    !Number.isSafeInteger(offset) || offset < 0 ||
    (id === null)
  ) {
    res.status(400).json({ error: 'invalid pagination or submission ID' })
    return
  }

  // Free text: an ID prefix or part of a site name; blank means no search
  const rawQuery = req.query.q
  if (rawQuery !== undefined && typeof rawQuery !== 'string') {
    res.status(400).json({ error: 'invalid q parameter' })
    return
  }
  const query = rawQuery?.trim() || undefined

  // Newest first by default; any other column starts ascending
  const sort = req.query.sort ?? 'updated'
  if (typeof sort !== 'string' || !(SUBMISSION_HISTORY_SORTS as readonly string[]).includes(sort)) {
    res.status(400).json({ error: 'invalid sort parameter' })
    return
  }
  const order = req.query.order ?? (sort === 'updated' ? 'desc' : 'asc')
  if (order !== 'asc' && order !== 'desc') {
    res.status(400).json({ error: 'invalid order parameter' })
    return
  }

  // One verification status, for example the records waiting on their contributor
  const status = req.query.status
  if (status !== undefined && (typeof status !== 'string' || !(VERIFICATION_STATUSES as readonly string[]).includes(status))) {
    res.status(400).json({ error: 'invalid status parameter' })
    return
  }

  try {
    res.status(200).json({
      items: await getSubmissionHistory({ limit, offset, deploymentId: id, query, sort: sort as SubmissionHistorySort, order, status: status as VerificationStatus | undefined }),
    })
  } catch (error) {
    next(error)
  }
})
router.get('/admin/deployments/:id', ...requireAdmin(), async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json({ error: 'deployment not found' })
    return
  }
  try {
    const record = await getReviewRecord(id)
    if (!record) {
      res.status(404).json({ error: 'deployment not found' })
      return
    }
    res.status(200).json(record)
  } catch (error) {
    next(error)
  }
})

router.post('/admin/deployments/:id/reviews', ...requireAdmin(), async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json({ error: 'deployment not found' })
    return
  }
  const result = validateReview(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid review', fields: result.errors })
    return
  }

  try {
    const outcome = await decide(id, currentAdmin(res).id, result.value)
    switch (outcome.kind) {
      case 'not_found':
        res.status(404).json({ error: 'deployment not found' })
        return
      case 'not_pending':
        res.status(409).json({ error: 'only records pending review or with changes requested can be decided', verification_status: outcome.verificationStatus })
        return
      case 'stale':
        res.status(409).json({ error: 'the record changed since you opened it', updated_at: outcome.updatedAt })
        return
      case 'missing_evidence':
        res.status(409).json({ error: 'at least one evidence URL is required before the record can be verified' })
        return
      case 'missing_coordinates':
        res.status(409).json({ error: 'site coordinates are required before the record can be verified' })
        return
      case 'decided':
        res.status(201).json({ id: outcome.reviewId, verification_status: outcome.verificationStatus })
    }
  } catch (error) {
    next(error)
  }
})

router.post('/admin/corrections/:id/reviews', ...requireAdmin(), async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json({ error: 'correction not found' })
    return
  }
  const result = validateReview(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid review', fields: result.errors })
    return
  }

  try {
    const outcome = await decideCorrection(id, currentAdmin(res).id, result.value)
    switch (outcome.kind) {
      case 'not_found':
        res.status(404).json({ error: 'correction not found' })
        return
      case 'not_pending':
        res.status(409).json({ error: 'only pending corrections can be decided', correction_status: outcome.correctionStatus })
        return
      case 'stale':
        res.status(409).json({ error: 'the record changed since you opened it', updated_at: outcome.updatedAt })
        return
      case 'invalid_window':
        res.status(409).json({ error: 'the proposed commissioning date is after the record\'s valid_to; correct the record or reject the proposal' })
        return
      case 'decided':
        res.status(201).json({ id: outcome.reviewId, correction_status: outcome.correctionStatus, verification_status: outcome.verificationStatus })
    }
  } catch (error) {
    next(error)
  }
})

router.patch('/admin/deployments/:id', ...requireAdmin(), async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json({ error: 'deployment not found' })
    return
  }
  const result = validateAdminCorrection(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid correction', fields: result.errors })
    return
  }

  try {
    const outcome = await correctAsAdministrator(id, currentAdmin(res).id, result.value)
    if (outcome.kind === 'not_found') {
      res.status(404).json({ error: 'deployment not found' })
      return
    }
    if (outcome.kind === 'closed') {
      res.status(409).json({ error: 'a rejected record is closed and cannot be corrected' })
      return
    }
    if (outcome.kind === 'unchanged') {
      res.status(400).json({ error: 'correction does not change the record' })
      return
    }
    if (outcome.kind === 'invalid_window') {
      const message = outcome.field === 'commissioning_date' ? 'must not be after valid_to' : 'must not be before valid_from'
      res.status(400).json({ error: 'invalid correction', fields: { [outcome.field]: message } })
      return
    }
    res.status(200).json({ id: outcome.id, verification_status: outcome.verificationStatus })
  } catch (error) {
    next(error)
  }
})

export default router
