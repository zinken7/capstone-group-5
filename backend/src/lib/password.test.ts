import { describe, expect, it } from 'vitest'

import { generateTemporaryPassword, hashPassword, verifyPassword } from './password.js'

describe('password hashing', () => {
  it('verifies the original password and rejects any other', async () => {
    const stored = await hashPassword('correct horse battery staple')

    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$[\w-]+\$[\w-]+$/)
    await expect(verifyPassword('correct horse battery staple', stored)).resolves.toBe(true)
    await expect(verifyPassword('correct horse battery stapl', stored)).resolves.toBe(false)
  })

  it('salts every hash', async () => {
    const [first, second] = await Promise.all([hashPassword('same password'), hashPassword('same password')])
    expect(first).not.toBe(second)
  })

  it.each(['', 'plain-text', 'scrypt$32768$8$1$c2FsdA', 'bcrypt$12$abc$def$ghi$jkl'])(
    'never matches a malformed stored value: %j',
    async (stored) => {
      await expect(verifyPassword('anything', stored)).resolves.toBe(false)
    },
  )

  it('generates 16-character URL-safe temporary passwords', () => {
    const passwords = new Set(Array.from({ length: 20 }, generateTemporaryPassword))
    expect(passwords.size).toBe(20)
    for (const password of passwords) expect(password).toMatch(/^[\w-]{16}$/)
  })
})
