import { describe, expect, it } from 'vitest'

import { passwordVersion, readCookie, signSession, verifySession } from './session.js'

const secret = 'unit-test-secret-0123456789abcdefghij'
const payload = { adminId: 7, version: 'v1', expiresAt: 2_000 }

describe('session tokens', () => {
  it('round-trips a signed payload', () => {
    expect(verifySession(signSession(payload, secret), secret, 1_000)).toEqual(payload)
  })

  it('rejects an expired token', () => {
    expect(verifySession(signSession(payload, secret), secret, 2_000)).toBeNull()
  })

  it('rejects a token signed with another secret', () => {
    expect(verifySession(signSession(payload, `${secret}x`), secret, 1_000)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const [, signature] = signSession(payload, secret).split('.')
    const forged = Buffer.from(JSON.stringify({ ...payload, adminId: 1 })).toString('base64url')
    expect(verifySession(`${forged}.${signature}`, secret, 1_000)).toBeNull()
  })

  it.each(['', 'abc', 'a.b.c', 'not-json.sig'])('rejects a malformed token: %j', (token) => {
    expect(verifySession(token, secret, 1_000)).toBeNull()
  })

  it('changes the password version when the hash changes', () => {
    expect(passwordVersion('hash-a', secret)).not.toBe(passwordVersion('hash-b', secret))
    expect(passwordVersion('hash-a', secret)).toBe(passwordVersion('hash-a', secret))
  })
})

describe('readCookie', () => {
  it('finds a cookie among others', () => {
    expect(readCookie('theme=dark; admin_session=abc.def; other=1', 'admin_session')).toBe('abc.def')
  })

  it('returns null when it is absent', () => {
    expect(readCookie(undefined, 'admin_session')).toBeNull()
    expect(readCookie('theme=dark', 'admin_session')).toBeNull()
  })
})
