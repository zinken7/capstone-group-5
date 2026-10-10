import { spawnSync } from 'node:child_process'
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
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['run', '--silent', 'db:migrate'], {
    shell: process.platform === 'win32',
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: connectionString },
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error('Applying migrations to the test database failed')
  }
}

/** Vitest global setup: make sure the test database exists and is migrated before any test file runs. */
export default async function setup(): Promise<void> {
  const testUrl = resolveTestDatabaseUrl(process.env)
  await ensureDatabaseExists(testUrl)
  runMigrations(testUrl)
}
