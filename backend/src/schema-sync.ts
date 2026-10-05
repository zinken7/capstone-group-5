import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

import { config } from './config.js'

const backendRoot = fileURLToPath(new URL('../', import.meta.url))
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const committedDirectory = fileURLToPath(new URL('./db/', import.meta.url))

const SCHEMA_FILES = ['schema.ts', 'relations.ts'] as const

/**
 * Introspection runs only against the database version CI checks drift on
 * (the postgis/postgis:17-3.5 image): PostgreSQL versions introspect the same
 * schema differently, which would make the committed files flap.
 */
const PINNED = { postgres: '17', postgis: '3.5', image: 'postgis/postgis:17-3.5' }

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

function run(command: string, args: readonly string[], env: NodeJS.ProcessEnv, cwd = backendRoot): void {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command
  const result = spawnSync(executable, [...args], { cwd, env, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${String(result.status)}`)
  }
}

async function withClient<T>(url: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

function maintenanceUrlOf(url: string): string {
  const maintenanceUrl = new URL(url)
  maintenanceUrl.pathname = '/postgres'
  return maintenanceUrl.toString()
}

/** Whether the server behind url runs the pinned PostgreSQL and offers the pinned PostGIS. */
async function matchesPinnedVersions(url: string): Promise<boolean> {
  try {
    return await withClient(maintenanceUrlOf(url), async (client) => {
      const result = await client.query<{ pg: string; postgis: string | null }>(`
        SELECT
          current_setting('server_version') AS pg,
          (SELECT default_version FROM pg_available_extensions WHERE name = 'postgis') AS postgis
      `)
      const row = result.rows[0]
      return row !== undefined
        && row.pg.startsWith(`${PINNED.postgres}.`)
        && (row.postgis ?? '').startsWith(PINNED.postgis)
    })
  } catch {
    return false
  }
}

/**
 * The server to introspect against: DATABASE_URL when it already runs the
 * pinned versions (CI's service container does), otherwise the Docker Compose
 * db service, which runs exactly the pinned image.
 */
async function resolveIntrospectionUrl(): Promise<string> {
  if (await matchesPinnedVersions(config.databaseUrl)) return config.databaseUrl

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT } = process.env
  if (POSTGRES_USER && POSTGRES_PASSWORD) {
    console.log(`DATABASE_URL is not PostgreSQL ${PINNED.postgres} with PostGIS ${PINNED.postgis}; starting the Docker Compose database (${PINNED.image})`)
    run('docker', ['compose', 'up', '-d', '--wait', 'db'], process.env, repositoryRoot)
    const composeUrl = `postgresql://${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}@localhost:${POSTGRES_PORT ?? '5432'}/postgres`
    if (await matchesPinnedVersions(composeUrl)) return composeUrl
    throw new Error(`The Docker Compose database does not run the pinned versions (expected ${PINNED.image})`)
  }

  throw new Error(
    `Schema introspection needs PostgreSQL ${PINNED.postgres} with PostGIS ${PINNED.postgis}, the versions CI checks drift on (${PINNED.image}). `
    + 'Point DATABASE_URL at one, or set POSTGRES_USER/POSTGRES_PASSWORD in the root .env so the Docker Compose database can be used, '
    + `or run a throwaway server: docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=scratch ${PINNED.image}`,
  )
}

/** Prints a unified diff between the committed and freshly introspected file. */
function printDiff(committedPath: string, freshPath: string): void {
  const result = spawnSync(
    'git',
    ['diff', '--no-index', '--unified=3', '--', committedPath, freshPath],
    { cwd: backendRoot, encoding: 'utf8' },
  )
  if (result.stdout) console.error(result.stdout)
}

async function syncSchema(update: boolean): Promise<void> {
  const baseUrl = await resolveIntrospectionUrl()
  const scratchUrl = new URL(baseUrl)
  scratchUrl.pathname = `/${SCRATCH_DATABASE}`

  await withClient(maintenanceUrlOf(baseUrl), async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`)
    await client.query(`CREATE DATABASE ${SCRATCH_DATABASE}`)
  })

  const outDirectory = await mkdtemp(path.join(tmpdir(), 'drizzle-pull-'))
  try {
    const env = { ...process.env, DATABASE_URL: scratchUrl.toString() }
    run('npm', ['run', '--silent', 'db:migrate'], env)
    run('npx', ['drizzle-kit', 'pull'], { ...env, DRIZZLE_OUT: outDirectory })

    let drifted = false
    for (const filename of SCHEMA_FILES) {
      const freshPath = path.join(outDirectory, filename)
      const fresh = normalise(await readFile(freshPath, 'utf8'))
      await writeFile(freshPath, fresh)
      const committedPath = path.join(committedDirectory, filename)

      if (update) {
        await writeFile(committedPath, fresh)
        console.log(`Updated ${path.relative(backendRoot, committedPath)}`)
        continue
      }

      const committed = await readFile(committedPath, 'utf8').catch(() => null)
      if (committed !== fresh) {
        drifted = true
        console.error(`src/db/${filename} is out of date with migrations/:`)
        printDiff(committedPath, freshPath)
      }
    }

    if (drifted) {
      console.error('Run "npm run db:schema:update" and commit the result.')
      process.exitCode = 1
    } else if (!update) {
      console.log('Committed Drizzle schema matches the migrated database.')
    }
  } finally {
    await rm(outDirectory, { recursive: true, force: true })
    await withClient(maintenanceUrlOf(baseUrl), (client) =>
      client.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`),
    ).catch(() => undefined)
  }
}

syncSchema(process.argv.includes('--update')).catch((error: unknown) => {
  console.error('Schema sync failed:', error)
  process.exitCode = 1
})
