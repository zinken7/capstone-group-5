import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import type { QueryResultRow } from 'pg'

import { config } from './config.js'
import * as relations from './db/relations.js'
import * as schema from './db/schema.js'

interface DatabaseVersionRow {
  postgresVersion: string
  postgisVersion: string
}

const pool = new Pool({ connectionString: config.databaseUrl })

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error)
})

/**
 * Drizzle client over the shared pool: the default data-access path for
 * repositories (#71). PostGIS and complex aggregates may stay as parameterised
 * queries through its sql template; closeDatabase() still closes the one pool.
 */
export const db = drizzle({ client: pool, schema: { ...schema, ...relations } })

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

/** Minimal query interface shared by the pool helper and a transaction client. */
export interface Queryable {
  query<Row extends QueryResultRow>(text: string, params?: readonly unknown[]): Promise<Row[]>
}

/** Runs fn inside BEGIN/COMMIT on one pooled connection; any error rolls the whole transaction back. */
export async function withTransaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  const tx: Queryable = {
    async query<Row extends QueryResultRow>(text: string, params: readonly unknown[] = []) {
      const result = await client.query<Row>(text, [...params])
      return result.rows
    },
  }

  try {
    await client.query('BEGIN')
    const result = await fn(tx)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
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
  const result = await pool.query<DatabaseVersionRow>(`
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
