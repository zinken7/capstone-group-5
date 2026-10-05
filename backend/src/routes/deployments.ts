import { Router } from 'express'

import { validateCorrection } from '../lib/correction-validation.js'
import { parseId } from '../lib/ids.js'
import { correctDeployment } from '../services/corrections.js'

const router = Router()

router.patch('/deployments/:id', async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json({ error: 'deployment not found' })
    return
  }

  const result = validateCorrection(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid correction', fields: result.errors })
    return
  }

  try {
    const outcome = await correctDeployment(id, result.value)
    if (outcome.kind === 'not_found') {
      res.status(404).json({ error: 'deployment not found' })
      return
    }
    if (outcome.kind === 'unchanged') {
      res.status(400).json({ error: 'correction does not change the record' })
      return
    }
    res.status(200).json({ id: outcome.id, verification_status: outcome.verificationStatus })
  } catch (error) {
    next(error)
  }
})

export default router
