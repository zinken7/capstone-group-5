import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/** Minimum length for a password chosen by an administrator. */
export const MIN_PASSWORD_LENGTH = 12

// scrypt cost parameters, stored with each hash so they can be raised later.
// N = 2^15 with r = 8 uses 32 MiB, affordable in a serverless function.
const COST = 2 ** 15
const BLOCK_SIZE = 8
const PARALLELISM = 1
const KEY_LENGTH = 64
const MAX_MEMORY = 64 * 1024 * 1024

function derive(password: string, salt: Buffer, cost: number, blockSize: number, parallelism: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      { N: cost, r: blockSize, p: parallelism, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })
}

/** Hashes a password as `scrypt$N$r$p$salt$key`, with base64url salt and key. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM)
  return ['scrypt', COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64url'), key.toString('base64url')].join('$')
}

/** Checks a password against a stored hash in constant time; a malformed hash never matches. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, blockSize, parallelism, salt, key] = stored.split('$')
  if (scheme !== 'scrypt' || !cost || !blockSize || !parallelism || !salt || !key) return false

  const expected = Buffer.from(key, 'base64url')
  if (expected.length !== KEY_LENGTH) return false

  try {
    const actual = await derive(password, Buffer.from(salt, 'base64url'), Number(cost), Number(blockSize), Number(parallelism))
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** A random 16-character password for a new account, shown once and changed at first sign-in. */
export function generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64url')
}
