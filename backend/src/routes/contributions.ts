import { Router } from 'express'

import { validateContribution } from '../lib/contribution-validation.js'
import { honeypotFilled } from '../lib/honeypot.js'
import { createContribution } from '../services/contributions.js'

const router = Router()

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
    res.status(201).json({ id: deployment.id, verification_status: deployment.verificationStatus })
  } catch (error) {
    next(error)
  }
})

export default router
