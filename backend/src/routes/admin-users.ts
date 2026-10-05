import { Router } from 'express'

import { validateAccountChange, validateNewAdministrator } from '../lib/admin-validation.js'
import { parseId } from '../lib/ids.js'
import { requireRoot } from '../middleware/require-admin.js'
import { normaliseEmail } from '../repositories/admin-users.js'
import { addAdministrator, listAccounts, setAccountActive } from '../services/admin-accounts.js'

const router = Router()

router.get('/admin/users', ...requireRoot(), async (_req, res, next) => {
  try {
    res.status(200).json({ items: await listAccounts() })
  } catch (error) {
    next(error)
  }
})

router.post('/admin/users', ...requireRoot(), async (req, res, next) => {
  const result = validateNewAdministrator(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid administrator', fields: result.errors })
    return
  }
  try {
    const outcome = await addAdministrator(result.value.email)
    if (outcome.kind === 'exists') {
      res.status(409).json({ error: 'an administrator with this email already exists' })
      return
    }
    // The temporary password is returned once and never stored in plain text
    res.status(201).json({
      id: outcome.id,
      email: normaliseEmail(result.value.email),
      role: 'admin',
      temporary_password: outcome.temporaryPassword,
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/admin/users/:id', ...requireRoot(), async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json({ error: 'administrator not found' })
    return
  }
  const result = validateAccountChange(req.body)
  if (!result.ok) {
    res.status(400).json({ error: 'invalid change', fields: result.errors })
    return
  }
  try {
    const outcome = await setAccountActive(id, result.value.active)
    if (outcome.kind === 'not_found') {
      res.status(404).json({ error: 'administrator not found' })
      return
    }
    if (outcome.kind === 'root') {
      res.status(409).json({ error: 'root accounts are managed from the command line' })
      return
    }
    res.status(200).json({ id, active: result.value.active })
  } catch (error) {
    next(error)
  }
})

export default router
