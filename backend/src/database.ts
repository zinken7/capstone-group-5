import { Pool } from 'pg'
import type { QueryResultRow } from 'pg'

import { config } from './config.js'

interface DatabaseVersionRow {
  postgresVersion: string
  postgisVersion: string
}

const pool = new Pool({ connectionString: config.databaseUrl })

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error)
})

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
