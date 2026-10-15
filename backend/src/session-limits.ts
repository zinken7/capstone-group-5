import type { ClientBase } from 'pg'

/**
 * Bounded work for every session on the database. A runaway query, or a
 * transaction left open by a frozen serverless function, is ended by the server
 * instead of holding a connection and its row locks until the platform gives up.
 *
 * Stored on the server rather than sent as connection parameters, so they hold
 * whichever endpoint the API connects through: a connection pooler such as
 * Neon's may refuse them as parameters.
 */
export const SESSION_LIMITS = {
  statement_timeout: '15s',
  idle_in_transaction_session_timeout: '60s',
} as const

export interface AppliedSessionLimits {
  /** `database` when the role owns the database, otherwise `role`: they then cover this role only. */
  scope: 'database' | 'role'
  database: string
  role: string
}

/**
 * Sets SESSION_LIMITS for new sessions; the current session keeps its own.
 * `npm run db:migrate` calls this on every run rather than recording it as a
 * migration, because pg_dump without --create leaves these settings out: a
 * restored database gets them back on its next migration.
 *
 * ALTER DATABASE needs the database owner. Any other role sets the limits for
 * itself in this database instead, which PostgreSQL allows every role to do.
 */
export async function applySessionLimits(client: ClientBase): Promise<AppliedSessionLimits> {
  const { rows } = await client.query<{ database: string; role: string; owns: boolean }>(`
    SELECT current_database() AS database,
           current_user AS role,
           pg_has_role(current_user, datdba, 'USAGE') AS owns
    FROM pg_database
    WHERE datname = current_database()
  `)
  const [current] = rows
  if (!current) {
    throw new Error('Could not find the current database in pg_database')
  }

  // ALTER takes neither identifiers nor values as parameters; both are escaped
  const database = client.escapeIdentifier(current.database)
  const target = current.owns ? `DATABASE ${database}` : `ROLE CURRENT_USER IN DATABASE ${database}`
  for (const [name, value] of Object.entries(SESSION_LIMITS)) {
    await client.query(`ALTER ${target} SET ${name} = ${client.escapeLiteral(value)}`)
  }

  return { scope: current.owns ? 'database' : 'role', database: current.database, role: current.role }
}
