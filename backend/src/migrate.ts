import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Client } from 'pg'
import { config } from './config.js'
import { applySessionLimits } from './session-limits.js'

const migrationsDirectory = fileURLToPath(
  new URL('../migrations/', import.meta.url),
)

/**
 * Session-level advisory lock, so that two backend containers starting at the
 * same time cannot apply the same migration twice. The value is arbitrary but
 * must not change. Released when the connection closes.
 */
const MIGRATION_LOCK_KEY = 520605

async function migrate(): Promise<void> {
  const client = new Client({
    connectionString: config.databaseUrl,
  })

  await client.connect()

  try {
    // The server bounds every statement (src/session-limits.ts); a migration such as an index build may need longer
    await client.query('SET statement_timeout = 0')
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY])

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const filename of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename],
      )

      // rowCount is number | null, so compare explicitly rather than against
      // zero: a null would otherwise read as "already applied" and the
      // migration would be skipped silently.
      if ((existing.rowCount ?? 0) > 0) {
        continue
      }

      const migrationPath = path.join(migrationsDirectory, filename)
      const sql = await readFile(migrationPath, 'utf8')

      console.log(`Applying ${filename}`)

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }

    // Applied on every run, so a database restored without them gets them back.
    // A safeguard rather than schema: a failure is reported, not fatal.
    try {
      const limits = await applySessionLimits(client)
      if (limits.scope === 'role') {
        console.warn(
          `Role ${limits.role} does not own database ${limits.database}, so the session limits cover ${limits.role} only. ` +
            'Connect the API as the same role, or run npm run db:migrate as the database owner.',
        )
      }
    } catch (error) {
      console.warn('Session limits not applied:', error)
    }

    console.log('Migrations complete')
  } finally {
    await client.end()
  }
}

migrate().catch((error: unknown) => {
  console.error('Migration failed:', error)
  process.exitCode = 1
})