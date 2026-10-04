import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase } = await import('./fixtures.js')

beforeEach(async () => {
  await resetDatabase()
  await query("INSERT INTO company (id, name) VALUES (1, 'Variant test manufacturer')")
})

afterAll(async () => {
  await closeDatabase()
})

describe.each([
  { label: 'named', modelName: 'Test model' },
  { label: 'unnamed', modelName: null },
])('$label machine model variants', ({ modelName }) => {
  async function insertVariant(variant: string | null) {
    return query<{ model_variant: string | null }>(
      `INSERT INTO machine_model (manufacturer_id, model_name, machine_type, model_variant)
       VALUES (1, $1, 'haul_truck', $2) RETURNING model_variant`,
      [modelName, variant],
    )
  }

  it('keeps an omitted variant unknown and allows an explicit base alongside it', async () => {
    const rows = await query<{ model_variant: string | null }>(
      `INSERT INTO machine_model (manufacturer_id, model_name, machine_type)
       VALUES (1, $1, 'haul_truck') RETURNING model_variant`,
      [modelName],
    )
    expect(rows).toEqual([{ model_variant: null }])
    expect(await insertVariant('base')).toEqual([{ model_variant: 'base' }])
  })

  it('rejects duplicate unknown variants', async () => {
    await insertVariant(null)
    await expect(insertVariant(null)).rejects.toMatchObject({ code: '23505' })
  })

  it('preserves display spelling but rejects case-insensitive duplicates', async () => {
    expect(await insertVariant('I')).toEqual([{ model_variant: 'I' }])
    await expect(insertVariant('i')).rejects.toMatchObject({ code: '23505' })
    expect(await insertVariant('K')).toEqual([{ model_variant: 'K' }])
  })

  it.each(['', ' ', ' base', 'base '])('rejects unnormalised value %j', async (variant) => {
    await expect(insertVariant(variant)).rejects.toMatchObject({
      code: '23514',
      constraint: 'machine_model_variant_normalised',
    })
  })
})
