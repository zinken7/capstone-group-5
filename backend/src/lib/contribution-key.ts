import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** 32 random bytes in base64url: 43 URL-safe characters, never padded. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** A new submission key and the hash that is stored in its place (FR-59). */
export function createContributionKey(): { key: string; hash: string } {
  const key = randomBytes(32).toString('base64url')
  return { key, hash: hashContributionKey(key) }
}

export function hashContributionKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/** A well-formed key, as sent in X-Contribution-Key or a status request; anything else is ignored. */
export function isContributionKey(value: unknown): value is string {
  return typeof value === 'string' && KEY_PATTERN.test(value)
}

/** Compares a presented key with a stored hash in constant time. A record without a hash matches nothing. */
export function keyMatches(key: string, storedHash: string | null): boolean {
  if (storedHash === null) return false
  const presented = Buffer.from(hashContributionKey(key), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  return presented.length === stored.length && timingSafeEqual(presented, stored)
}
