import { Router } from 'express'

import { validateContribution } from '../lib/contribution-validation.js'
import { createContribution } from '../services/contributions.js'

const router = Router()

router.post('/contributions', async (req, res, next) => {
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
