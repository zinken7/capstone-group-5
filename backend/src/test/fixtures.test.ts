import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('./fixtures.js')

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await closeDatabase()
})

async function count(table: string): Promise<number> {
  // 表名来自本文件的固定列表，不是用户输入 / Table names come from this file's fixed list, not user input
  const rows = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`)
  return Number(rows[0]?.count)
}

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
