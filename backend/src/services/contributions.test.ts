import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { validateContribution } = await import('../lib/contribution-validation.js')
const { createContribution } = await import('./contributions.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

function input(body: Record<string, unknown>) {
  const result = validateContribution({ disclosure_accepted: true, ...body })
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.value
}

async function count(table: string): Promise<number> {
  // Table names come from this file, not user input
  const rows = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM ${table}`)
  return rows[0]?.count ?? 0
}

const newSite = {
  site_name: 'Jimblebar',
  country_code: 'AU',
  machine_type: 'drill',
  machine_manufacturer: 'Epiroc',
  quantity: 4,
}

describe('createContribution', () => {
  it('stores an anonymous minimal submission as pending review', async () => {
    const result = await createContribution(input(newSite))

    expect(result.verificationStatus).toBe('pending_review')
    const [deployment] = await query<Record<string, unknown>>(
      `SELECT s.name AS site, c.name AS manufacturer, m.model_name, m.model_variant, m.machine_type::text,
              d.quantity, d.technology_product_id, d.installation_type::text, d.verification_status::text
       FROM deployment d JOIN site s ON s.id = d.site_id
       JOIN machine_model m ON m.id = d.machine_model_id JOIN company c ON c.id = m.manufacturer_id
       WHERE d.id = $1`,
      [result.id],
    )
    expect(deployment).toEqual({
      site: 'Jimblebar',
      manufacturer: 'Epiroc',
      model_name: null,
      model_variant: null,
      machine_type: 'drill',
      quantity: 4,
      technology_product_id: null,
      installation_type: 'unknown',
      verification_status: 'pending_review',
    })
    expect(await count('contributor')).toBe(0)
  })

  it.each([null, 'Pit Viper 271'])('reuses unknown variants for model %j and records null in revisions', async (modelName) => {
    const before = await count('machine_model')
    const modelIds = new Set<number>()
    for (const variant of [undefined, null, '', ' ', '\t\n']) {
      const result = await createContribution(input({
        ...newSite, machine_model: modelName, machine_model_variant: variant,
      }))
      const [row] = await query<{ model_id: number; model_variant: string | null; snapshot: Record<string, unknown> }>(
        `SELECT m.id::int AS model_id, m.model_variant, r.previous_values AS snapshot
         FROM deployment d JOIN machine_model m ON m.id = d.machine_model_id
         JOIN revision r ON r.deployment_id = d.id WHERE d.id = $1`,
        [result.id],
      )
      expect(row).toBeDefined()
      expect(row?.model_variant).toBeNull()
      expect(row?.snapshot).toHaveProperty('machine_model_variant', null)
      modelIds.add(row!.model_id)
    }
    expect(modelIds.size).toBe(1)
    expect(await count('machine_model')).toBe(before + 1)
  })

  it.each([null, 'Pit Viper 271'])('keeps unknown and base distinct and reuses case variants for model %j', async (modelName) => {
    async function submit(variant: string | null) {
      const result = await createContribution(input({
        ...newSite, machine_model: modelName, machine_model_variant: variant,
      }))
      const [row] = await query<{ model_id: number; model_variant: string | null }>(
        `SELECT m.id::int AS model_id, m.model_variant FROM deployment d
         JOIN machine_model m ON m.id = d.machine_model_id WHERE d.id = $1`,
        [result.id],
      )
      expect(row).toBeDefined()
      return row!
    }
    const unknown = await submit(null)
    const base = await submit('base')
    expect(base.model_id).not.toBe(unknown.model_id)
    expect(base.model_variant).toBe('base')
    expect(await submit('BASE')).toEqual(base)
    expect(await submit(null)).toEqual(unknown)
    const upper = await submit('I')
    expect(upper.model_variant).toBe('I')
    expect(await submit(' i ')).toEqual(upper)
  })

  it('records a create revision holding the submission without contact details', async () => {
    const result = await createContribution(input({ ...newSite, contributor_email: 'a@example.com', technology_supplier: 'Epiroc' }))

    const [revision] = await query<{ action: string; previous_values: Record<string, unknown>; contributor_id: number | null }>(
      'SELECT action::text, previous_values, contributor_id::int FROM revision WHERE deployment_id = $1',
      [result.id],
    )
    expect(revision?.action).toBe('create')
    expect(revision?.contributor_id).not.toBeNull()
    expect(revision?.previous_values).toMatchObject({ site_name: 'Jimblebar', technology_supplier: 'Epiroc', quantity: 4 })
    expect(revision?.previous_values).not.toHaveProperty('contributor_email')
  })

  it('reuses existing site, companies, model and product regardless of case', async () => {
    const before = { site: await count('site'), company: await count('company'), model: await count('machine_model'), product: await count('technology_product') }

    const result = await createContribution(input({
      site_name: 'roy hill',
      country_code: 'au',
      machine_type: 'haul_truck',
      machine_manufacturer: 'CATERPILLAR',
      machine_model: 'caterpillar 793f',
      quantity: 3,
      technology_supplier: 'caterpillar',
      technology_product: 'cat minestar command for hauling',
    }))

    const [row] = await query<{ site_id: number; machine_model_id: number; technology_product_id: number }>(
      'SELECT site_id::int, machine_model_id::int, technology_product_id::int FROM deployment WHERE id = $1',
      [result.id],
    )
    expect(row).toEqual({ site_id: 1, machine_model_id: 1, technology_product_id: 1 })
    expect({ site: await count('site'), company: await count('company'), model: await count('machine_model'), product: await count('technology_product') }).toEqual(before)
  })

  it('stores optional details, evidence and year-only commissioning', async () => {
    const result = await createContribution(input({
      ...newSite,
      region: 'Pilbara',
      commodity: 'iron_ore',
      machine_model: 'Pit Viper 271',
      machine_model_variant: 'XC',
      environment: 'surface',
      deployment_status: 'operational',
      automation_level: 'autonomous',
      installation_type: 'retrofit',
      commissioning_date: '2019',
      evidence_urls: ['https://example.com/a', 'https://example.com/b'],
      contributor_email: 'analyst@example.com',
      organisation: 'Example Mining',
    }))

    const [deployment] = await query<Record<string, unknown>>(
      `SELECT r.name AS region, m.model_variant, d.environment::text, d.status::text, d.automation_level::text,
              d.installation_type::text, d.commissioning_date::text, d.commissioning_year, d.valid_from::text
       FROM deployment d JOIN site s ON s.id = d.site_id LEFT JOIN region r ON r.id = s.region_id
       JOIN machine_model m ON m.id = d.machine_model_id
       WHERE d.id = $1`,
      [result.id],
    )
    expect(deployment).toEqual({
      region: 'Pilbara',
      model_variant: 'XC',
      environment: 'surface',
      status: 'operational',
      automation_level: 'autonomous',
      installation_type: 'retrofit',
      commissioning_date: null,
      commissioning_year: 2019,
      valid_from: null,
    })

    const evidence = await query<{ url: string }>('SELECT url FROM evidence WHERE deployment_id = $1 ORDER BY url', [result.id])
    expect(evidence.map((row) => row.url)).toEqual(['https://example.com/a', 'https://example.com/b'])
    expect(await query('SELECT email, organisation FROM contributor')).toEqual([
      { email: 'analyst@example.com', organisation: 'Example Mining' },
    ])
  })

  it('keeps the automation level when no technology product is known', async () => {
    const result = await createContribution(input({ ...newSite, automation_level: 'teleremote', technology_supplier: 'RCT' }))

    const [row] = await query<{ automation_level: string; technology_product_id: number | null }>(
      'SELECT automation_level::text, technology_product_id FROM deployment WHERE id = $1',
      [result.id],
    )
    expect(row).toEqual({ automation_level: 'teleremote', technology_product_id: null })
  })

  it('rolls back every row when a later insert fails', async () => {
    const before = { site: await count('site'), company: await count('company'), deployment: await count('deployment') }

    // Bypasses validation so the deployment CHECK (quantity > 0) fails after the site and company inserts
    await expect(createContribution({ ...input(newSite), quantity: 0 })).rejects.toThrow('deployment_quantity_check')

    expect({ site: await count('site'), company: await count('company'), deployment: await count('deployment') }).toEqual(before)
  })
})
