import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { config } from '../config.js'
import {
  passwordVersion,
  readCookie,
  SESSION_COOKIE,
  SESSION_COOKIE_PATH,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
} from '../lib/session.js'
import { findAdminById } from '../repositories/admin-users.js'
import type { AdminUser } from '../repositories/admin-users.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Modifying admin requests must send `X-Requested-With: fetch`. With the
 * SameSite=Strict cookie this blocks cross-site request forgery: a cross-site
 * page cannot add the header without a CORS preflight, which the API never allows.
 */
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction): void {
  if (!SAFE_METHODS.has(req.method) && req.get('X-Requested-With') !== 'fetch') {
    res.status(403).json({ error: 'missing X-Requested-With: fetch header' })
    return
  }
  next()
}

/** The session secret, or null after answering 503 when sign-in is not configured. */
export function sessionSecretOr503(res: Response): string | null {
  try {
    return config.sessionSecret
  } catch (error) {
    console.error('Administrator sign-in is not configured:', error instanceof Error ? error.message : error)
    res.status(503).json({ error: 'administrator sign-in is not configured' })
    return null
  }
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.secureCookies,
  sameSite: 'strict' as const,
  path: SESSION_COOKIE_PATH,
})

export function startSession(res: Response, admin: AdminUser, secret: string): void {
  const token = signSession({
    adminId: admin.id,
    version: passwordVersion(admin.passwordHash, secret),
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }, secret)
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_SECONDS * 1000 })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions())
}

/** The administrator that requireAdmin attached to this request. */
export function currentAdmin(res: Response): AdminUser {
  return res.locals.admin as AdminUser
}

/**
 * Requires a valid session for an active administrator. The account is
 * reloaded on every request, so deactivating it or changing its password ends
 * its sessions immediately. Until a temporary password is changed, only routes
 * that opt in with `allowPendingPasswordChange` are reachable.
 */
export function requireAdmin(options: { allowPendingPasswordChange?: boolean } = {}): RequestHandler[] {
  const authenticate: RequestHandler = async (req, res, next) => {
    const secret = sessionSecretOr503(res)
    if (!secret) return

    try {
      const token = readCookie(req.get('Cookie'), SESSION_COOKIE)
      const payload = token ? verifySession(token, secret) : null
      const admin = payload ? await findAdminById(payload.adminId) : null

      if (!payload || !admin || !admin.active || payload.version !== passwordVersion(admin.passwordHash, secret)) {
        clearSessionCookie(res)
        res.status(401).json({ error: 'sign in required' })
        return
      }
      if (admin.mustChangePassword && !options.allowPendingPasswordChange) {
        res.status(403).json({ error: 'password change required' })
        return
      }

      res.locals.admin = admin
      next()
    } catch (error) {
      next(error)
    }
  }

  return [requireCsrfHeader, authenticate]
}

/** requireAdmin, plus the root role: for managing administrator accounts (#100). */
export function requireRoot(): RequestHandler[] {
  const checkRole: RequestHandler = (_req, res, next) => {
    if (currentAdmin(res).role !== 'root') {
      res.status(403).json({ error: 'root administrator required' })
      return
    }
    next()
  }
  return [...requireAdmin(), checkRole]
}
