import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

import { databaseNameOf, resolveTestDatabaseUrl } from './database-url.js'

const backendRoot = fileURLToPath(new URL('../../', import.meta.url))

/** Creates the test database when it does not exist yet, using the server's maintenance database. */
async function ensureDatabaseExists(connectionString: string): Promise<void> {
  const name = databaseNameOf(connectionString)
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`Refusing to create database with unexpected name: ${name}`)
  }

  const maintenanceUrl = new URL(connectionString)
  maintenanceUrl.pathname = '/postgres'

  const client = new Client({ connectionString: maintenanceUrl.toString() })
  await client.connect()
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if ((existing.rowCount ?? 0) === 0) {
      console.log(`Creating test database ${name}`)
      // Identifiers cannot be parameterised; the name was validated above.
      await client.query(`CREATE DATABASE "${name}"`)
    }
  } finally {
    await client.end()
  }
}

function runMigrations(connectionString: string): void {
  const tsxCli = resolve(backendRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const result = spawnSync(process.execPath, [tsxCli, 'src/migrate.ts'], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: connectionString },
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.error('Test database migration diagnostics:', {
      status: result.status,
      signal: result.signal,
      error: result.error?.message,
      command: process.execPath,
      cwd: backendRoot,
    })
    throw new Error('Applying migrations to the test database failed')
  }
}

/** Vitest global setup: make sure the test database exists and is migrated before any test file runs. */
export default async function setup(): Promise<void> {
  const testUrl = resolveTestDatabaseUrl(process.env)
  await ensureDatabaseExists(testUrl)
  runMigrations(testUrl)
}
