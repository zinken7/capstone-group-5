import { Pool } from 'pg'

import { config } from './config.js'

interface DatabaseVersionRow {
  postgresVersion: string
  postgisVersion: string
}

const pool = new Pool({ connectionString: config.databaseUrl })

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error)
})

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
