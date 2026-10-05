import { query } from '../database.js'

export type AdminRole = 'root' | 'admin'

export interface AdminUser {
  id: number
  email: string
  passwordHash: string
  role: AdminRole
  active: boolean
  mustChangePassword: boolean
}

const columns = `
  id::int AS id, email, password_hash AS "passwordHash", role, active,
  must_change_password AS "mustChangePassword"
`

/** Emails are stored and compared in lower case. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const rows = await query<AdminUser>(`SELECT ${columns} FROM admin_user WHERE email = $1`, [normaliseEmail(email)])
  return rows[0] ?? null
}

export async function findAdminById(id: number): Promise<AdminUser | null> {
  const rows = await query<AdminUser>(`SELECT ${columns} FROM admin_user WHERE id = $1`, [id])
  return rows[0] ?? null
}

/** Inserts an account; returns null when the email is already taken. */
export async function insertAdmin(admin: {
  email: string
  passwordHash: string
  role: AdminRole
  mustChangePassword: boolean
}): Promise<number | null> {
  const rows = await query<{ id: number }>(
    `INSERT INTO admin_user (email, password_hash, role, must_change_password)
     VALUES ($1, $2, $3::admin_role, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id::int AS id`,
    [normaliseEmail(admin.email), admin.passwordHash, admin.role, admin.mustChangePassword],
  )
  return rows[0]?.id ?? null
}

export async function updateAdminPassword(id: number, passwordHash: string): Promise<void> {
  await query(
    'UPDATE admin_user SET password_hash = $2, must_change_password = false WHERE id = $1',
    [id, passwordHash],
  )
}
