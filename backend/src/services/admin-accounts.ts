import { findAdminById, listAdmins, setAdminActive } from '../repositories/admin-users.js'
import type { AdminAccount } from '../repositories/admin-users.js'
import { createAdmin } from './admin-auth.js'
import type { CreateAdminOutcome } from './admin-auth.js'

export function listAccounts(): Promise<AdminAccount[]> {
  return listAdmins()
}

/** Adds an administrator with a temporary password. Root accounts are created only from the command line. */
export function addAdministrator(email: string): Promise<CreateAdminOutcome> {
  return createAdmin(email, 'admin')
}

export type AccountChangeOutcome = { kind: 'changed' } | { kind: 'not_found' } | { kind: 'root' }

/** Deactivating ends the account's sessions at once, because requireAdmin reloads the account on every request. */
export async function setAccountActive(id: number, active: boolean): Promise<AccountChangeOutcome> {
  const account = await findAdminById(id)
  if (!account) return { kind: 'not_found' }
  if (account.role === 'root') return { kind: 'root' }
  await setAdminActive(id, active)
  return { kind: 'changed' }
}
