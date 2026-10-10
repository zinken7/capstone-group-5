import { generateTemporaryPassword, hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '../lib/password.js'
import {
  findAdminByEmail,
  findAdminById,
  insertAdmin,
  updateAdminPassword,
} from '../repositories/admin-users.js'
import type { AdminRole, AdminUser } from '../repositories/admin-users.js'

// Checked when the email is unknown, so a failed sign-in takes about as long
// whether or not the account exists.
let unknownAccountHash: Promise<string> | undefined

/** The active account for these credentials, otherwise null. */
export async function authenticate(email: string, password: string): Promise<AdminUser | null> {
  const admin = await findAdminByEmail(email)
  if (!admin) {
    unknownAccountHash ??= hashPassword(generateTemporaryPassword())
    await verifyPassword(password, await unknownAccountHash)
    return null
  }
  const matches = await verifyPassword(password, admin.passwordHash)
  return matches && admin.active ? admin : null
}

export type PasswordChangeOutcome =
  | { kind: 'changed'; admin: AdminUser }
  | { kind: 'incorrect_current' }
  | { kind: 'too_short' }
  | { kind: 'unchanged' }

export async function changePassword(adminId: number, currentPassword: string, newPassword: string): Promise<PasswordChangeOutcome> {
  const admin = await findAdminById(adminId)
  if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) return { kind: 'incorrect_current' }
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { kind: 'too_short' }
  if (newPassword === currentPassword) return { kind: 'unchanged' }

  const passwordHash = await hashPassword(newPassword)
  await updateAdminPassword(adminId, passwordHash)
  return { kind: 'changed', admin: { ...admin, passwordHash, mustChangePassword: false } }
}

export type CreateAdminOutcome =
  | { kind: 'created'; id: number; temporaryPassword: string }
  | { kind: 'exists' }

/** Creates an account with a temporary password that must be changed at first sign-in. */
export async function createAdmin(email: string, role: AdminRole): Promise<CreateAdminOutcome> {
  const temporaryPassword = generateTemporaryPassword()
  const id = await insertAdmin({
    email,
    passwordHash: await hashPassword(temporaryPassword),
    role,
    mustChangePassword: true,
  })
  return id === null ? { kind: 'exists' } : { kind: 'created', id, temporaryPassword }
}
