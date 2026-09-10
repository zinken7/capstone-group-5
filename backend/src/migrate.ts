import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { Client } from 'pg'

import { config } from './config.js'

const migrationsDirectory = fileURLToPath(
  new URL('../migrations/', import.meta.url),
)

async function migrate(): Promise<void> {
  const client = new Client({
    connectionString: config.databaseUrl,
  })

  await client.connect()

  try {
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

      if (existing.rowCount !== 0) {
        console.log(`Skipping ${filename}`)
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

    console.log('Migrations complete')
  } finally {
    await client.end()
  }
}

migrate().catch((error: unknown) => {
  console.error('Migration failed:', error)
  process.exitCode = 1
})