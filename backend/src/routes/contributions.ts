import { Router } from 'express'
import type { Request } from 'express'

import { isContributionKey } from '../lib/contribution-key.js'
import { validateContribution } from '../lib/contribution-validation.js'
import { validateCorrection } from '../lib/correction-validation.js'
import { honeypotFilled } from '../lib/honeypot.js'
import { parseId } from '../lib/ids.js'
import { createContribution, ResubmissionRefusedError } from '../services/contributions.js'
import { checkCorrectionStatuses, readOwnCorrection } from '../services/correction-access.js'
import { checkStatuses, readOwnContribution, updateOwnContribution } from '../services/contributor-access.js'
import { toRegisterDto } from './register.js'

const router = Router()

/** Status checks per request: enough for one browser's list, small enough to stay cheap */
const MAX_STATUS_ITEMS = 50

router.post('/contributions', async (req, res, next) => {
  // Checked before validation, and answered without field errors, so a bot learns nothing (FR-51)
  if (honeypotFilled(req.body)) {
    res.status(400).json({ error: 'invalid contribution' })
    return
  }

  const result = validateContribution(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid contribution', fields: result.errors })
    return
  }

  try {
    const deployment = await createContribution(result.value)
    // The key is returned once and never again; only its hash is stored (FR-59)
    res.status(201).json({ id: deployment.id, verification_status: deployment.verificationStatus, key: deployment.key })
  } catch (error) {
    if (error instanceof ResubmissionRefusedError) {
      res.status(400).json({ error: 'invalid contribution', fields: { resubmission_of: 'is not a rejected submission of yours' } })
      return
    }
    next(error)
  }
})

/** `{ items: [{ id, key }] }`, 1 to 50 well-formed pairs; null for anything else. */
function readStatusRequest(body: unknown): { id: number; key: string }[] | null {
  const items = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).items : undefined
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_STATUS_ITEMS) return null
  const pairs: { id: number; key: string }[] = []
  for (const item of items) {
    const object = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {}
    const id = typeof object.id === 'number' || typeof object.id === 'string' ? parseId(String(object.id)) : null
    if (id === null || !isContributionKey(object.key)) return null
    pairs.push({ id, key: object.key })
  }
  return pairs
}

// POST so the keys travel in the body, never in a URL or an access log
router.post('/contributions/status', async (req, res, next) => {
  const pairs = readStatusRequest(req.body)
  if (!pairs) {
    res.status(400).json({ error: `items must hold 1 to ${MAX_STATUS_ITEMS} submissions, each with its id and key` })
    return
  }
  try {
    res.status(200).json({ items: await checkStatuses(pairs) })
  } catch (error) {
    next(error)
  }
})

// A proposed correction is followed the same way as a submission (#223)
router.post('/corrections/status', async (req, res, next) => {
  const pairs = readStatusRequest(req.body)
  if (!pairs) {
    res.status(400).json({ error: `items must hold 1 to ${MAX_STATUS_ITEMS} corrections, each with its id and key` })
    return
  }
  try {
    res.status(200).json({ items: await checkCorrectionStatuses(pairs) })
  } catch (error) {
    next(error)
  }
})

router.get('/corrections/:id', async (req, res, next) => {
  const owner = ownership(req)
  if (!owner) {
    res.status(404).json({ error: 'correction not found' })
    return
  }
  try {
    const correction = await readOwnCorrection(owner.id, owner.key)
    if (!correction) {
      res.status(404).json({ error: 'correction not found' })
      return
    }
    res.status(200).json({ ...correction, record: correction.record && toRegisterDto(correction.record) })
  } catch (error) {
    next(error)
  }
})

/** The id and key of a request for one submission; null when either is missing or malformed. */
function ownership(req: Request): { id: number; key: string } | null {
  const id = parseId(req.params.id)
  const key = req.get('X-Contribution-Key')
  return id !== null && isContributionKey(key) ? { id, key } : null
}

// A wrong key, a missing key and an unknown record all read as not found, so nothing is learnt by guessing
const NOT_FOUND = { error: 'contribution not found' }

router.get('/contributions/:id', async (req, res, next) => {
  const owner = ownership(req)
  if (!owner) {
    res.status(404).json(NOT_FOUND)
    return
  }
  try {
    const contribution = await readOwnContribution(owner.id, owner.key)
    if (!contribution) {
      res.status(404).json(NOT_FOUND)
      return
    }
    res.status(200).json(contribution)
  } catch (error) {
    next(error)
  }
})

router.patch('/contributions/:id', async (req, res, next) => {
  const owner = ownership(req)
  if (!owner) {
    res.status(404).json(NOT_FOUND)
    return
  }
  if (honeypotFilled(req.body)) {
    res.status(400).json({ error: 'invalid update' })
    return
  }
  // A contributor may also supply the site's location when it has none, since approval needs it
  const result = validateCorrection(req.body, { coordinates: true })
  if (!result.ok) {
    res.status(400).json({ error: 'invalid update', fields: result.errors })
    return
  }

  try {
    const outcome = await updateOwnContribution(owner.id, owner.key, result.value)
    switch (outcome.kind) {
      case 'not_found':
        res.status(404).json(NOT_FOUND)
        return
      case 'not_open':
        res.status(409).json({ error: 'only a submission waiting for review or with changes requested can be updated', verification_status: outcome.verificationStatus })
        return
      case 'unchanged':
        res.status(400).json({ error: 'update does not change the submission' })
        return
      case 'invalid_window':
        res.status(400).json({ error: 'invalid update', fields: { commissioning_date: 'must not be after valid_to' } })
        return
      case 'site_located':
        res.status(400).json({ error: 'invalid update', fields: { latitude: 'the site already has coordinates', longitude: 'the site already has coordinates' } })
        return
      case 'updated':
        res.status(200).json({ id: outcome.id, verification_status: outcome.verificationStatus })
    }
  } catch (error) {
    next(error)
  }
})

export default router
