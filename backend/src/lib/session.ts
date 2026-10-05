import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'admin_session'
export const SESSION_COOKIE_PATH = '/api/admin'
export const SESSION_TTL_SECONDS = 8 * 60 * 60

/**
 * Signed, stateless session: no session store is needed, which suits serverless
 * functions. `version` ties the session to the current password hash, so
 * changing the password ends every other session.
 */
export interface SessionPayload {
  adminId: number
  version: string
  /** Expiry as seconds since the Unix epoch. */
  expiresAt: number
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function signSession(payload: SessionPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data, secret)}`
}

/** Returns the payload of a correctly signed, unexpired token, otherwise null. */
export function verifySession(token: string, secret: string, nowSeconds = Date.now() / 1000): SessionPayload | null {
  const [data, signature, extra] = token.split('.')
  if (!data || !signature || extra !== undefined) return null

  const expected = Buffer.from(sign(data, secret))
  const actual = Buffer.from(signature)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  try {
    const payload: unknown = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (
      typeof payload !== 'object' || payload === null ||
      !('adminId' in payload) || !Number.isSafeInteger(payload.adminId) ||
      !('version' in payload) || typeof payload.version !== 'string' ||
      !('expiresAt' in payload) || typeof payload.expiresAt !== 'number'
    ) {
      return null
    }
    if (payload.expiresAt <= nowSeconds) return null
    return { adminId: payload.adminId as number, version: payload.version, expiresAt: payload.expiresAt }
  } catch {
    return null
  }
}

/** Short fingerprint of a password hash; it changes whenever the password does. */
export function passwordVersion(passwordHash: string, secret: string): string {
  return sign(`password:${passwordHash}`, secret).slice(0, 22)
}

/** Reads one cookie from a Cookie header. */
export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}
