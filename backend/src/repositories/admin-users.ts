import { eq } from 'drizzle-orm'

import { db } from '../database.js'
import * as tables from '../db/schema.js'

export type AdminRole = 'root' | 'admin'

export interface AdminUser {
  id: number
  email: string
  passwordHash: string
  role: AdminRole
  active: boolean
  mustChangePassword: boolean
}

const columns = {
  id: tables.adminUser.id,
  email: tables.adminUser.email,
  passwordHash: tables.adminUser.passwordHash,
  role: tables.adminUser.role,
  active: tables.adminUser.active,
  mustChangePassword: tables.adminUser.mustChangePassword,
}

/** Emails are stored and compared in lower case. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const rows = await db.select(columns).from(tables.adminUser).where(eq(tables.adminUser.email, normaliseEmail(email)))
  return rows[0] ?? null
}

export async function findAdminById(id: number): Promise<AdminUser | null> {
  const rows = await db.select(columns).from(tables.adminUser).where(eq(tables.adminUser.id, id))
  return rows[0] ?? null
}

/** Inserts an account; returns null when the email is already taken. */
export async function insertAdmin(admin: {
  email: string
  passwordHash: string
  role: AdminRole
  mustChangePassword: boolean
}): Promise<number | null> {
  const rows = await db
    .insert(tables.adminUser)
    .values({
      email: normaliseEmail(admin.email),
      passwordHash: admin.passwordHash,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    })
    .onConflictDoNothing({ target: tables.adminUser.email })
    .returning({ id: tables.adminUser.id })
  return rows[0]?.id ?? null
}

export async function updateAdminPassword(id: number, passwordHash: string): Promise<void> {
  await db
    .update(tables.adminUser)
    .set({ passwordHash, mustChangePassword: false })
    .where(eq(tables.adminUser.id, id))
}
