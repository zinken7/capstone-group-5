import { and, asc, eq, sql } from 'drizzle-orm'

import { db } from '../database.js'
import * as tables from '../db/schema.js'
import { isoTimestamp } from '../lib/iso-timestamp.js'

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

export interface AdminAccount {
  id: number
  email: string
  role: AdminRole
  active: boolean
  must_change_password: boolean
  created_at: string
}

/** Every account, root accounts first. */
export async function listAdmins(): Promise<AdminAccount[]> {
  return db
    .select({
      id: tables.adminUser.id,
      email: tables.adminUser.email,
      role: tables.adminUser.role,
      active: tables.adminUser.active,
      must_change_password: tables.adminUser.mustChangePassword,
      created_at: isoTimestamp(tables.adminUser.createdAt),
    })
    .from(tables.adminUser)
    .orderBy(sql`${tables.adminUser.role} = 'root' DESC`, asc(tables.adminUser.email))
}

/** Activates or deactivates an administrator; root accounts are never changed here. */
export async function setAdminActive(id: number, active: boolean): Promise<boolean> {
  const rows = await db
    .update(tables.adminUser)
    .set({ active })
    .where(and(eq(tables.adminUser.id, id), eq(tables.adminUser.role, 'admin')))
    .returning({ id: tables.adminUser.id })
  return rows.length > 0
}
