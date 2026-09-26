import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { assertTestDatabase, resetDatabase, seedMapFixtures } = await import('./fixtures.js')

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await closeDatabase()
})

async function count(table: string): Promise<number> {
  // Table names come from this file's fixed list, not user input
  const rows = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`)
  return Number(rows[0]?.count)
}

describe('assertTestDatabase', () => {
  it('accepts a database named "test" or ending in "_test"', () => {
    expect(() => assertTestDatabase('postgresql://test:test@localhost:5432/test')).not.toThrow()
    expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/autonomous_mining_test')).not.toThrow()
  })

  it('refuses a development database', () => {
    expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/autonomous_mining')).toThrow(
      'Refusing to reset database "autonomous_mining"',
    )
  })

  it('is applied to the connection string the suite is running with', () => {
    expect(() => assertTestDatabase(process.env.DATABASE_URL ?? '')).not.toThrow()
  })
})

describe('map fixtures', () => {
  it('starts from an empty database', async () => {
    expect(await count('site')).toBe(0)
    expect(await count('deployment')).toBe(0)
  })

  it('seeds the sites and deployments with the expected ids', async () => {
    await seedMapFixtures()

    const sites = await query<{ id: number }>('SELECT id FROM site ORDER BY id')
    const deployments = await query<{ id: number }>('SELECT id FROM deployment ORDER BY id')

    expect(sites.map((row) => Number(row.id))).toEqual([1, 2, 3])
    expect(deployments.map((row) => Number(row.id))).toEqual([10, 11, 12, 14])
  })

  it('can be seeded again after a reset without id conflicts', async () => {
    await seedMapFixtures()
    await resetDatabase()
    await seedMapFixtures()

    expect(await count('deployment')).toBe(4)
  })
})
