import { afterAll, describe, expect, it } from 'vitest'

// Connection string comes from the environment or the root .env (loaded by config.ts)
const { closeDatabase, query } = await import('./database.js')

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
