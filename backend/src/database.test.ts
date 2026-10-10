import { afterAll, describe, expect, it } from 'vitest'

// Connection string comes from the environment or the root .env (loaded by config.ts)
const { closeDatabase, query, withTransaction } = await import('./database.js')
const { company } = await import('./db/schema.js')
const { resetDatabase } = await import('./test/fixtures.js')

afterAll(async () => {
  await closeDatabase()
})

describe('query', () => {
  it('runs a parameterised statement and returns the rows', async () => {
    const rows = await query<{ sum: number; label: string }>(
      'SELECT $1::int + $2::int AS sum, $3::text AS label',
      [2, 3, 'ok'],
    )

    expect(rows).toEqual([{ sum: 5, label: 'ok' }])
  })

  it('returns an empty array when nothing matches', async () => {
    const rows = await query('SELECT 1 AS value WHERE false')

    expect(rows).toEqual([])
  })
})

describe('withTransaction', () => {
  async function companyNames(): Promise<string[]> {
    const rows = await query<{ name: string }>('SELECT name FROM company ORDER BY name')
    return rows.map((row) => row.name)
  }

  it('commits every statement when the callback succeeds', async () => {
    await resetDatabase()

    const result = await withTransaction(async (tx) => {
      await tx.db.insert(company).values({ name: 'Epiroc' })
      await tx.db.insert(company).values({ name: 'Komatsu' })
      return 'done'
    })

    expect(result).toBe('done')
    expect(await companyNames()).toEqual(['Epiroc', 'Komatsu'])
  })

  it('rolls back every statement when the callback throws', async () => {
    await resetDatabase()

    await expect(withTransaction(async (tx) => {
      await tx.db.insert(company).values({ name: 'Epiroc' })
      throw new Error('boom')
    })).rejects.toThrow('boom')

    expect(await companyNames()).toEqual([])
  })
})
