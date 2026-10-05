import { Router } from 'express'

import { MIN_PASSWORD_LENGTH } from '../lib/password.js'
import {
  clearSessionCookie,
  currentAdmin,
  requireAdmin,
  requireCsrfHeader,
  sessionSecretOr503,
  startSession,
} from '../middleware/require-admin.js'
import type { AdminUser } from '../repositories/admin-users.js'
import { authenticate, changePassword } from '../services/admin-auth.js'

const router = Router()

function profile(admin: AdminUser) {
  return { email: admin.email, role: admin.role, must_change_password: admin.mustChangePassword }
}

router.post('/admin/session', requireCsrfHeader, async (req, res, next) => {
  const body: unknown = req.body
  const email = typeof body === 'object' && body !== null && 'email' in body ? body.email : undefined
  const password = typeof body === 'object' && body !== null && 'password' in body ? body.password : undefined
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  const secret = sessionSecretOr503(res)
  if (!secret) return

  try {
    const admin = await authenticate(email, password)
    if (!admin) {
      // Same answer for an unknown email, a wrong password and a deactivated account
      res.status(401).json({ error: 'incorrect email or password' })
      return
    }
    startSession(res, admin, secret)
    res.status(200).json(profile(admin))
  } catch (error) {
    next(error)
  }
})

router.get('/admin/session', ...requireAdmin({ allowPendingPasswordChange: true }), (_req, res) => {
  res.status(200).json(profile(currentAdmin(res)))
})

router.delete('/admin/session', requireCsrfHeader, (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})

router.post('/admin/password', ...requireAdmin({ allowPendingPasswordChange: true }), async (req, res, next) => {
  const body: unknown = req.body
  const current = typeof body === 'object' && body !== null && 'current_password' in body ? body.current_password : undefined
  const proposed = typeof body === 'object' && body !== null && 'new_password' in body ? body.new_password : undefined
  if (typeof current !== 'string' || typeof proposed !== 'string') {
    res.status(400).json({ error: 'current_password and new_password are required' })
    return
  }

  const secret = sessionSecretOr503(res)
  if (!secret) return

  try {
    const outcome = await changePassword(currentAdmin(res).id, current, proposed)
    switch (outcome.kind) {
      case 'incorrect_current':
        res.status(400).json({ error: 'current password is incorrect' })
        return
      case 'too_short':
        res.status(400).json({ error: `new password must be at least ${MIN_PASSWORD_LENGTH} characters` })
        return
      case 'unchanged':
        res.status(400).json({ error: 'new password must differ from the current password' })
        return
      case 'changed':
        // The old session no longer matches the password; issue a new one
        startSession(res, outcome.admin, secret)
        res.status(200).json(profile(outcome.admin))
    }
  } catch (error) {
    next(error)
  }
})

export default router
