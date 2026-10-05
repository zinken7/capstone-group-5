import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

import { config } from './config.js'

const backendRoot = fileURLToPath(new URL('../', import.meta.url))
const committedDirectory = fileURLToPath(new URL('./db/', import.meta.url))

const SCHEMA_FILES = ['schema.ts', 'relations.ts'] as const

/**
 * Throwaway database the SQL migrations are replayed into before
 * introspection, so the committed schema always reflects migrations/ rather
 * than whatever state a development database happens to be in.
 */
const SCRATCH_DATABASE = 'schema_drift_check'

/**
 * drizzle-kit emits extensionless relative imports; this package resolves
 * imports with NodeNext, which requires the .js extension. The same rewrite
 * runs on the update and the check path, so the comparison stays byte-exact.
 */
function normalise(source: string): string {
  return source.replace(/ from "\.\/(schema|relations)"/g, ' from "./$1.js"')
}

function run(command: string, args: readonly string[], env: NodeJS.ProcessEnv): void {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command
  const result = spawnSync(executable, [...args], { cwd: backendRoot, env, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${String(result.status)}`)
  }
}

/** Runs fn against the server's maintenance database, as the test global setup does. */
async function withMaintenanceClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const maintenanceUrl = new URL(config.databaseUrl)
  maintenanceUrl.pathname = '/postgres'

  const client = new Client({ connectionString: maintenanceUrl.toString() })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

async function syncSchema(update: boolean): Promise<void> {
  const scratchUrl = new URL(config.databaseUrl)
  scratchUrl.pathname = `/${SCRATCH_DATABASE}`

  await withMaintenanceClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`)
    await client.query(`CREATE DATABASE ${SCRATCH_DATABASE}`)
  })

  const outDirectory = await mkdtemp(path.join(tmpdir(), 'drizzle-pull-'))
  try {
    const env = { ...process.env, DATABASE_URL: scratchUrl.toString() }
    run('npm', ['run', '--silent', 'db:migrate'], env)
    run('npx', ['drizzle-kit', 'pull'], { ...env, DRIZZLE_OUT: outDirectory })

    const drifted: string[] = []
    for (const filename of SCHEMA_FILES) {
      const fresh = normalise(await readFile(path.join(outDirectory, filename), 'utf8'))
      const committedPath = path.join(committedDirectory, filename)

      if (update) {
        await writeFile(committedPath, fresh)
        console.log(`Updated ${path.relative(backendRoot, committedPath)}`)
        continue
      }

      const committed = await readFile(committedPath, 'utf8').catch(() => null)
      if (committed !== fresh) drifted.push(filename)
    }

    if (drifted.length > 0) {
      console.error(`Committed files out of date with migrations/: ${drifted.map((f) => `src/db/${f}`).join(', ')}`)
      console.error(`Freshly introspected files kept in ${outDirectory} for comparison.`)
      console.error('Run "npm run db:schema:update" and commit the result.')
      process.exitCode = 1
    } else if (!update) {
      console.log('Committed Drizzle schema matches the migrated database.')
    }
  } finally {
    if (process.exitCode !== 1) {
      await rm(outDirectory, { recursive: true, force: true })
    }
    await withMaintenanceClient((client) =>
      client.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`),
    ).catch(() => undefined)
  }
}

syncSchema(process.argv.includes('--update')).catch((error: unknown) => {
  console.error('Schema sync failed:', error)
  process.exitCode = 1
})
