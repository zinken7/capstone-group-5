import { DrizzleQueryError, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import type { QueryResultRow } from 'pg'

import { config } from './config.js'
import * as relations from './db/relations.js'
import * as schema from './db/schema.js'

const databaseSchema = { ...schema, ...relations }

type DatabaseVersionRow = {
  postgresVersion: string
  postgisVersion: string
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Fail fast when the database cannot be reached, rather than leaving the
  // request waiting until the platform ends it. Ten seconds allows for a Neon
  // compute waking from suspension. Statement limits are set on the database
  // itself (migration 012), since a pooler may refuse them as parameters here.
  connectionTimeoutMillis: 10_000,
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error)
})

/**
 * Drizzle client over the shared pool: the default data-access path for
 * repositories (#71). PostGIS and complex aggregates may stay as parameterised
 * queries through its sql template; closeDatabase() still closes the one pool.
 */
export const db = drizzle({ client: pool, schema: databaseSchema })

/**
 * Shared parameterised query entry point used by routes and repositories (NFR-05).
 */
export async function query<Row extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await pool.query<Row>(text, [...params])
  return result.rows
}

/** Transaction handle passed to repositories: Drizzle bound to the transaction's connection. */
export interface Tx {
  db: NodePgDatabase<typeof databaseSchema>
}

/** Runs fn inside BEGIN/COMMIT on one pooled connection; any error rolls the whole transaction back. */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  const tx: Tx = {
    db: drizzle({ client, schema: databaseSchema }),
  }

  try {
    await client.query('BEGIN')
    const result = await fn(tx)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    // Drizzle wraps driver failures; rethrow the pg error so callers keep
    // seeing the constraint names and codes they always have.
    throw error instanceof DrizzleQueryError && error.cause instanceof Error ? error.cause : error
  } finally {
    client.release()
  }
}

/**
 * Close the pool; called when tests finish or the process shuts down.
 */
export async function closeDatabase(): Promise<void> {
  await pool.end()
}

export async function checkDatabaseHealth(): Promise<DatabaseVersionRow> {
  const result = await db.execute<DatabaseVersionRow>(sql`
    SELECT
      current_setting('server_version') AS "postgresVersion",
      postgis_version() AS "postgisVersion"
  `)
  const versions = result.rows[0]

  if (!versions) {
    throw new Error('PostgreSQL health query returned no rows')
  }

  return versions
}
