import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { seedFixtures } from './fixtures.js'
import { loadSeed, readSeedFiles, SeedValidationError, validateSeed, type SeedData } from './load.js'
import { seedReference } from './reference.js'

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test'

const REFERENCE_TABLES = ['company', 'region', 'machine_model', 'technology_product'] as const
const FIXTURE_TABLES = ['site', 'site_company_role', 'deployment'] as const

interface TableState {
  count: number
  checksum: string | null
  ids: string[]
}

const client = new Client({ connectionString: process.env.DATABASE_URL })
let seed: SeedData

/**
 * Count, content checksum and id set of a table. created_at and updated_at
 * are excluded: they differ between runs by design.
 */
async function tableState(table: string): Promise<TableState> {
  const result = await client.query<TableState>(`
    SELECT
      count(*)::int AS count,
      md5(string_agg((to_jsonb(t) - 'created_at' - 'updated_at')::text, ',' ORDER BY t.id)) AS checksum,
      coalesce(array_agg(t.id ORDER BY t.id), '{}') AS ids
    FROM ${table} t
  `)
  const state = result.rows[0]

  if (!state) {
    throw new Error(`no state row for ${table}`)
  }

  return state
}

async function snapshot(tables: readonly string[]): Promise<Record<string, TableState>> {
  const states: Record<string, TableState> = {}
  for (const table of tables) {
    states[table] = await tableState(table)
  }
  return states
}

beforeAll(async () => {
  await client.connect()

  const migrated = await client.query<{ migrated: boolean }>("SELECT to_regclass('deployment') IS NOT NULL AS migrated")
  if (!migrated.rows[0]?.migrated) {
    throw new Error(`${process.env.DATABASE_URL} is not migrated; run npm run db:migrate against it first`)
  }

  seed = await loadSeed()
  await seedReference(client, seed)
  await seedFixtures(client, seed)
})

afterAll(async () => {
  await client.end()
})

describe('db:seed:reference', () => {
  it('is idempotent: a second run leaves identical row counts and checksums', async () => {
    await seedReference(client, seed)
    const first = await snapshot(REFERENCE_TABLES)

    await seedReference(client, seed)
    const second = await snapshot(REFERENCE_TABLES)

    expect(second).toEqual(first)
    for (const table of REFERENCE_TABLES) {
      expect(first[table]?.count).toBeGreaterThan(0)
    }
  })
})

describe('db:seed:fixtures', () => {
  it('is reproducible: a second run yields identical counts, checksums and id sets', async () => {
    await seedFixtures(client, seed)
    const first = await snapshot(FIXTURE_TABLES)

    await seedFixtures(client, seed)
    const second = await snapshot(FIXTURE_TABLES)

    expect(second).toEqual(first)
    for (const table of FIXTURE_TABLES) {
      expect(first[table]?.count).toBeGreaterThan(0)
      // The truncate restarts identity, so ids are reproducible, not merely equal in number.
      expect(first[table]?.ids).toEqual(second[table]?.ids)
    }
  })

  it('rejects a verified deployment with no technology product by validation, before any database call', async () => {
    const files = structuredClone(await readSeedFiles())
    const deployments = files.find((file) => file.file === 'fixtures/deployments.json')
    const row: unknown = deployments?.rows[0]

    if (typeof row !== 'object' || row === null) {
      throw new Error('expected at least one fixture deployment')
    }

    const broken = row as Record<string, unknown>
    broken.verification_status = 'verified'
    broken.technology_product = null

    // validateSeed is synchronous and has no database handle, so a rejection
    // here cannot have come from the CHECK constraint in 001.
    let error: unknown
    try {
      validateSeed(files)
    } catch (thrown) {
      error = thrown
    }

    expect(error).toBeInstanceOf(SeedValidationError)
    expect((error as SeedValidationError).issues).toContainEqual({
      file: 'fixtures/deployments.json',
      key: broken.key,
      field: 'technology_product',
      message: expect.stringContaining('verified'),
    })
  })
})

/**
 * Coverage contract, seed-spec §8: one it() per scenario row, each asserting
 * that the fixtures contain what the named query needs. Add a case here in
 * the same shape whenever a scenario's rows land in fixtures/.
 */
describe('fixture coverage (seed-spec §8)', () => {
  it('has a deployment with no technology product that is unverified (submission before classification)', async () => {
    const result = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM deployment
      WHERE technology_product_id IS NULL AND verification_status = 'unverified'
    `)

    expect(result.rows[0]?.count).toBeGreaterThanOrEqual(1)
  })

  it('has every automation level in use by at least one deployment', async () => {
    const result = await client.query<{ count: number }>(`
      SELECT count(DISTINCT tp.automation_level)::int AS count
      FROM deployment d
      JOIN technology_product tp ON tp.id = d.technology_product_id
      WHERE tp.automation_level IS NOT NULL
    `)

    expect(result.rows[0]?.count).toBe(4)
  })

  it('has sites in at least six countries', async () => {
    const result = await client.query<{ count: number }>('SELECT count(DISTINCT country_code)::int AS count FROM site')

    expect(result.rows[0]?.count).toBeGreaterThanOrEqual(6)
  })

  it('has at least one underground site', async () => {
    const result = await client.query<{ count: number }>(`
      SELECT count(DISTINCT site_id)::int AS count
      FROM deployment
      WHERE environment = 'underground'
    `)

    expect(result.rows[0]?.count).toBeGreaterThanOrEqual(1)
  })

  it('has at least one retrofit: an OEM machine running a third-party product', async () => {
    const result = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM deployment d
      JOIN machine_model mm ON mm.id = d.machine_model_id
      JOIN technology_product tp ON tp.id = d.technology_product_id
      WHERE mm.manufacturer_id <> tp.supplier_id
    `)

    expect(result.rows[0]?.count).toBeGreaterThanOrEqual(1)
  })
})
