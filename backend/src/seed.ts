import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const seedFile = fileURLToPath(
  new URL('../seeds/seed_global.sql', import.meta.url),
)

/**
 * The seed is a psql script (it uses \set), so it is run through psql rather
 * than the pg client. Reading the connection string from config keeps the same
 * DATABASE_URL and root .env handling as db:migrate.
 */
const result = spawnSync(
  'psql',
  ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--dbname', config.databaseUrl, '--file', seedFile],
  { stdio: 'inherit' },
)

if (result.error) {
  console.error('Seed failed: could not run psql:', result.error.message)
  process.exitCode = 1
} else {
  process.exitCode = result.status ?? 1
}
