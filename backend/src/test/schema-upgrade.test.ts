import { spawnSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'

import { config } from '../config.js'
import { databaseNameOf } from './database-url.js'

/**
 * Upgrades a Sprint 2 database (only migration 001 applied) with the standard
 * `npm run db:migrate`, in scratch databases beside the test database, so the
 * shared test database is never touched.
 */

const backendRoot = fileURLToPath(new URL('../../', import.meta.url))
const scratchDatabases: string[] = []

function urlFor(name: string): string {
  const url = new URL(config.databaseUrl)
  url.pathname = `/${name}`
  return url.toString()
}

async function withClient<T>(connectionString: string, use: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    return await use(client)
  } finally {
    await client.end()
  }
}

/** A fresh database in the Sprint 2 state: 001 applied and recorded by the runner, nothing later. */
async function createSprint2Database(suffix: string, data: string): Promise<string> {
  const name = `${databaseNameOf(config.databaseUrl)}_${suffix}`
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Unexpected database name: ${name}`)

  // Identifiers cannot be parameterised; the name was validated above
  await withClient(urlFor('postgres'), async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await client.query(`CREATE DATABASE "${name}"`)
  })
  scratchDatabases.push(name)

  const initialSchema = await readFile(new URL('../../migrations/001_initial_schema.sql', import.meta.url), 'utf8')
  const url = urlFor(name)
  await withClient(url, async (client) => {
    await client.query('CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
    await client.query('BEGIN')
    await client.query(initialSchema)
    await client.query("INSERT INTO schema_migrations (filename) VALUES ('001_initial_schema.sql')")
    await client.query('COMMIT')
    await client.query(data)
  })
  return url
}

function runMigrations(connectionString: string): { status: number | null; output: string } {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['run', '--silent', 'db:migrate'], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: connectionString },
    encoding: 'utf8',
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

async function appliedMigrations(client: Client): Promise<string[]> {
  const result = await client.query<{ filename: string }>('SELECT filename FROM schema_migrations ORDER BY filename')
  return result.rows.map((row) => row.filename)
}

// Sprint 2 shaped data: two unverified deployments, one with a full date and one without
const SPRINT_2_DATA = `
  INSERT INTO company (id, name, country_code) VALUES (1, 'Caterpillar', 'US'), (2, 'Roy Hill Holdings', 'AU');
  INSERT INTO region (id, name, country_code) VALUES (1, 'Pilbara', 'AU');
  INSERT INTO site (id, name, country_code, region_id, commodity, mine_status, point_4326)
    VALUES (1, 'Roy Hill', 'AU', 1, 'iron_ore', 'operating', ST_SetSRID(ST_MakePoint(118.7, -22.3), 4326));
  INSERT INTO site_company_role (site_id, company_id, role) VALUES (1, 2, 'owner');
  INSERT INTO machine_model (id, manufacturer_id, model_name, machine_type, size_class, max_payload_tonnes)
    VALUES (1, 1, 'Caterpillar 793F', 'haul_truck', 'ultra', 227), (2, 1, NULL, 'drill', NULL, NULL);
  INSERT INTO technology_product (id, supplier_id, product_name, automation_level)
    VALUES (1, 1, 'Cat MineStar Command for hauling', 'autonomous'), (2, 1, 'Cat MineStar Terrain for drilling', 'teleremote');
  INSERT INTO deployment (
    id, site_id, machine_model_id, technology_product_id, quantity, environment,
    commissioning_date, status, verification_status, valid_from, created_at, updated_at
  ) VALUES
    (10, 1, 1, 1, 96, 'surface', '2021-03-15', 'operational', 'pending_review', '2021-03-15',
      '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z'),
    (11, 1, 2, 2, 4, 'both', NULL, 'announced', 'unverified', NULL,
      '2026-08-01T00:00:00Z', '2026-08-03T00:00:00Z');
`

afterAll(async () => {
  await withClient(urlFor('postgres'), async (client) => {
    for (const name of scratchDatabases) await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
  })
})

describe('upgrading a Sprint 2 database', () => {
  it('applies every later migration and keeps every existing row and value', { timeout: 60_000 }, async () => {
    const url = await createSprint2Database('sprint2_upgrade', SPRINT_2_DATA)

    const result = runMigrations(url)
    expect(result.status, result.output).toBe(0)

    await withClient(url, async (client) => {
      // Every migration in migrations/, so a new one is covered without editing this test
      const allMigrations = (await readdir(new URL('../../migrations/', import.meta.url))).filter((file) => file.endsWith('.sql')).sort()
      expect(await appliedMigrations(client)).toEqual(allMigrations)

      const counts = await client.query(`
        SELECT
          (SELECT COUNT(*)::int FROM company) AS companies,
          (SELECT COUNT(*)::int FROM region) AS regions,
          (SELECT COUNT(*)::int FROM site) AS sites,
          (SELECT COUNT(*)::int FROM site_company_role) AS roles,
          (SELECT COUNT(*)::int FROM machine_model) AS models,
          (SELECT COUNT(*)::int FROM technology_product) AS products,
          (SELECT COUNT(*)::int FROM deployment) AS deployments
      `)
      expect(counts.rows[0]).toEqual({ companies: 2, regions: 1, sites: 1, roles: 1, models: 2, products: 2, deployments: 2 })

      const deployments = await client.query(`
        SELECT id::int AS id, quantity, environment::text AS environment, commissioning_date::text AS commissioning_date,
          commissioning_year, status::text AS status, verification_status::text AS verification_status,
          automation_level::text AS automation_level, installation_type::text AS installation_type,
          technology_supplier_id::int AS supplier_id,
          updated_at = created_at + make_interval(days => id::int - 9) AS updated_at_kept
        FROM deployment ORDER BY id
      `)
      expect(deployments.rows).toEqual([
        // The year comes from the full date and the level and supplier from the product (005); nothing else is invented
        { id: 10, quantity: 96, environment: 'surface', commissioning_date: '2021-03-15', commissioning_year: 2021, status: 'operational', verification_status: 'pending_review', automation_level: 'autonomous', installation_type: 'unknown', supplier_id: 1, updated_at_kept: true },
        { id: 11, quantity: 4, environment: 'both', commissioning_date: null, commissioning_year: null, status: 'announced', verification_status: 'unverified', automation_level: 'teleremote', installation_type: 'unknown', supplier_id: 1, updated_at_kept: true },
      ])

      const recreatedEnums = await client.query(`
        SELECT m.machine_type::text AS machine_type, m.model_variant, p.automation_level::text AS product_level,
          ST_AsText(s.point_4326) AS point
        FROM deployment d
        JOIN machine_model m ON m.id = d.machine_model_id
        JOIN site s ON s.id = d.site_id
        LEFT JOIN technology_product p ON p.id = d.technology_product_id
        WHERE d.id = 10
      `)
      expect(recreatedEnums.rows[0]).toEqual({ machine_type: 'haul_truck', model_variant: null, product_level: 'autonomous', point: 'POINT(118.7 -22.3)' })

      const history = await client.query(`
        SELECT
          (SELECT COUNT(*)::int FROM evidence) AS evidence,
          (SELECT COUNT(*)::int FROM contributor) AS contributors,
          (SELECT COUNT(*)::int FROM admin_user) AS admins,
          (SELECT COUNT(*)::int FROM verification_review) AS reviews,
          (SELECT COUNT(*)::int FROM revision) AS revisions
      `)
      expect(history.rows[0]).toEqual({ evidence: 0, contributors: 0, admins: 0, reviews: 0, revisions: 0 })
    })

    // A second run finds nothing to apply
    const again = runMigrations(url)
    expect(again.status, again.output).toBe(0)
    expect(again.output).not.toContain('Applying')
  })

  it.each([
    {
      label: 'verified deployments, which the old schema holds no evidence for',
      suffix: 'sprint2_verified',
      extra: "UPDATE deployment SET verification_status = 'verified' WHERE id = 10;",
      message: 'Existing verified deployments have no evidence',
    },
    {
      label: 'the removed line_of_sight_remote automation level',
      suffix: 'sprint2_line_of_sight',
      extra: "INSERT INTO technology_product (id, supplier_id, product_name, automation_level) VALUES (3, 1, 'Legacy remote', 'line_of_sight_remote');",
      message: 'Legacy line_of_sight_remote values remain',
    },
  ])('refuses to upgrade a database with $label, and leaves it unchanged', async ({ suffix, extra, message }) => {
    const url = await createSprint2Database(suffix, `${SPRINT_2_DATA}\n${extra}`)

    const result = runMigrations(url)
    expect(result.status).not.toBe(0)
    expect(result.output).toContain(message)

    await withClient(url, async (client) => {
      expect(await appliedMigrations(client)).toEqual(['001_initial_schema.sql'])
      const state = await client.query(`
        SELECT to_regclass('evidence') IS NULL AS no_evidence_table,
          (SELECT COUNT(*)::int FROM deployment) AS deployments
      `)
      expect(state.rows[0]).toEqual({ no_evidence_table: true, deployments: 2 })
    })
  }, 60_000)

  it.each([
    {
      label: 'a deployment with no product, whose supplier cannot be recovered',
      suffix: 'sprint2_no_product',
      extra: 'UPDATE deployment SET technology_product_id = NULL WHERE id = 11;',
      counts: '1 deployments without a recoverable supplier, 1 without a recoverable automation level',
    },
    {
      label: 'a deployment whose product has no level',
      suffix: 'sprint2_unclassified',
      extra: 'UPDATE technology_product SET automation_level = NULL WHERE id = 2;',
      counts: '0 deployments without a recoverable supplier, 1 without a recoverable automation level',
    },
  ])('stops at migration 005 for $label, leaving the deployments as they were', async ({ suffix, extra, counts }) => {
    const url = await createSprint2Database(suffix, `${SPRINT_2_DATA}\n${extra}`)

    const result = runMigrations(url)
    expect(result.status).not.toBe(0)
    expect(result.output).toContain(`SRS v0.6 migration blocked: ${counts}`)

    await withClient(url, async (client) => {
      // Each migration commits on its own, so 002 to 004 stay applied and 005 changes nothing
      const allMigrations = (await readdir(new URL('../../migrations/', import.meta.url))).filter((file) => file.endsWith('.sql')).sort()
      expect(await appliedMigrations(client)).toEqual(allMigrations.filter((file) => file < '005'))
      const state = await client.query(`
        SELECT (SELECT COUNT(*)::int FROM deployment WHERE automation_level IS NOT NULL) AS levelled,
          to_regclass('deployment_technology_supplier_id_idx') IS NULL AS no_supplier_column
      `)
      expect(state.rows[0]).toEqual({ levelled: 0, no_supplier_column: true })
    })
  }, 60_000)
})
