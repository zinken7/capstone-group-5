import type { Client } from 'pg'

import { upsertAliases } from './aliases.js'
import type { SeedData } from './load.js'
import type { MachineModel, Region, TechnologyProduct } from './schemas.js'

/** Rows written per table, for the CLI to print. */
export type RowCounts = Record<string, number>

interface IdRow {
  id: string
}

/** BIGINT ids arrive from pg as strings. */
function returnedId(result: { rows: IdRow[] }, what: string): number {
  const row = result.rows[0]

  if (!row) {
    throw new Error(`${what}: upsert returned no row`)
  }

  return Number(row.id)
}

export function lookup(ids: Map<string, number>, key: string, what: string): number {
  const id = ids.get(key)

  if (id === undefined) {
    throw new Error(`${what} ${JSON.stringify(key)} has no id in this run`)
  }

  return id
}

/** Shared by both companies files: fictional owners use the same statement (seed-spec §5). */
export async function upsertCompany(client: Client, company: { name: string; country_code: string | null }): Promise<number> {
  const result = await client.query<IdRow>(
    `INSERT INTO company (name, country_code) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET country_code = EXCLUDED.country_code
     RETURNING id`,
    [company.name, company.country_code],
  )

  return returnedId(result, `company ${company.name}`)
}

async function upsertRegion(client: Client, region: Region): Promise<number> {
  // The no-op SET makes RETURNING yield the existing row's id on conflict.
  const result = await client.query<IdRow>(
    `INSERT INTO region (name, country_code) VALUES ($1, $2)
     ON CONFLICT (name, country_code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [region.name, region.country_code],
  )

  return returnedId(result, `region ${region.key}`)
}

async function upsertMachineModel(client: Client, model: MachineModel, manufacturerId: number): Promise<number> {
  // Two paths, matching the two partial unique indexes in 001: a named model
  // per manufacturer, or one unnamed catch-all per manufacturer and type.
  const onConflict =
    model.model_name === null
      ? `ON CONFLICT (manufacturer_id, machine_type) WHERE model_name IS NULL DO UPDATE SET
           size_class = EXCLUDED.size_class,
           max_payload_tonnes = EXCLUDED.max_payload_tonnes,
           operating_weight_tonnes = EXCLUDED.operating_weight_tonnes`
      : `ON CONFLICT (manufacturer_id, model_name) WHERE model_name IS NOT NULL DO UPDATE SET
           machine_type = EXCLUDED.machine_type,
           size_class = EXCLUDED.size_class,
           max_payload_tonnes = EXCLUDED.max_payload_tonnes,
           operating_weight_tonnes = EXCLUDED.operating_weight_tonnes`

  const result = await client.query<IdRow>(
    `INSERT INTO machine_model
       (manufacturer_id, model_name, machine_type, size_class, max_payload_tonnes, operating_weight_tonnes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ${onConflict}
     RETURNING id`,
    [manufacturerId, model.model_name, model.machine_type, model.size_class, model.max_payload_tonnes, model.operating_weight_tonnes],
  )

  return returnedId(result, `machine_model ${model.key}`)
}

async function upsertTechnologyProduct(client: Client, product: TechnologyProduct, supplierId: number): Promise<number> {
  const result = await client.query<IdRow>(
    `INSERT INTO technology_product (supplier_id, product_name, vendor_term, automation_level, level_basis)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (supplier_id, product_name) DO UPDATE SET
       vendor_term = EXCLUDED.vendor_term,
       automation_level = EXCLUDED.automation_level,
       level_basis = EXCLUDED.level_basis
     RETURNING id`,
    [supplierId, product.product_name, product.vendor_term, product.automation_level, product.level_basis],
  )

  return returnedId(result, `technology_product ${product.key}`)
}

/**
 * Upserts the reference catalogue on natural keys, in one transaction:
 * company, region, machine_model, technology_product, then company aliases
 * when that table exists. Rows removed from JSON are never deleted; reference
 * data is not destructively synced (seed-spec §6).
 */
export async function seedReference(client: Client, seed: SeedData): Promise<RowCounts> {
  const { regions, companies, machineModels, technologyProducts } = seed.reference

  await client.query('BEGIN')
  try {
    const companyIds = new Map<string, number>()
    for (const company of companies) {
      companyIds.set(company.key, await upsertCompany(client, company))
    }

    for (const region of regions) {
      await upsertRegion(client, region)
    }

    for (const model of machineModels) {
      await upsertMachineModel(client, model, lookup(companyIds, model.manufacturer, 'company'))
    }

    for (const product of technologyProducts) {
      await upsertTechnologyProduct(client, product, lookup(companyIds, product.supplier, 'company'))
    }

    const aliasCount = await upsertAliases(
      client,
      'company_alias',
      companies.map((company) => ({ id: lookup(companyIds, company.key, 'company'), aliases: company.aliases })),
    )

    await client.query('COMMIT')

    const counts: RowCounts = {
      company: companies.length,
      region: regions.length,
      machine_model: machineModels.length,
      technology_product: technologyProducts.length,
    }
    if (aliasCount !== null) {
      counts.company_alias = aliasCount
    }
    return counts
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
