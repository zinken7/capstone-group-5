import { DatabaseError, type Client } from 'pg'

import { tableExists, upsertAliases } from './aliases.js'
import { byKey, type SeedData } from './load.js'
import { lookup, upsertCompany, type RowCounts } from './reference.js'
import type { MachineModel, Region, Site, TechnologyProduct } from './schemas.js'

/** Fixtures are synthetic; a production database must never receive them (seed-spec §1). */
export function assertFixturesAllowed(nodeEnv: string | undefined = process.env.NODE_ENV): void {
  if (nodeEnv === 'production') {
    throw new Error('Refusing to load fixtures: NODE_ENV is production. Fixtures are synthetic and exist for development and test only.')
  }
}

interface IdRow {
  id: string
}

/**
 * Resolves reference rows to database ids by natural key, cached per run
 * (seed-spec §6 step 7). Never creates them: a missing row means the
 * catalogue has not been seeded into this database yet.
 */
class ReferenceIds {
  private readonly client: Client
  private readonly cache = new Map<string, number>()
  private readonly companies: Map<string, { name: string }>
  private readonly regions: Map<string, Region>
  private readonly machineModels: Map<string, MachineModel>
  private readonly technologyProducts: Map<string, TechnologyProduct>

  constructor(client: Client, seed: SeedData) {
    this.client = client
    this.companies = byKey([...seed.reference.companies, ...seed.fixtures.companies])
    this.regions = byKey(seed.reference.regions)
    this.machineModels = byKey(seed.reference.machineModels)
    this.technologyProducts = byKey(seed.reference.technologyProducts)
  }

  async company(key: string): Promise<number> {
    const company = seedRow(this.companies, key, 'company')
    return this.resolve('company', key, 'SELECT id FROM company WHERE name = $1', [company.name])
  }

  async region(key: string): Promise<number> {
    const region = seedRow(this.regions, key, 'region')
    return this.resolve('region', key, 'SELECT id FROM region WHERE name = $1 AND country_code = $2', [
      region.name,
      region.country_code,
    ])
  }

  async machineModel(key: string): Promise<number> {
    const model = seedRow(this.machineModels, key, 'machine_model')
    const manufacturerId = await this.company(model.manufacturer)

    // Same two natural keys as the partial unique indexes in 001.
    return model.model_name === null
      ? this.resolve(
          'machine_model',
          key,
          'SELECT id FROM machine_model WHERE manufacturer_id = $1 AND machine_type = $2 AND model_name IS NULL',
          [manufacturerId, model.machine_type],
        )
      : this.resolve('machine_model', key, 'SELECT id FROM machine_model WHERE manufacturer_id = $1 AND model_name = $2', [
          manufacturerId,
          model.model_name,
        ])
  }

  async technologyProduct(key: string): Promise<number> {
    const product = seedRow(this.technologyProducts, key, 'technology_product')
    const supplierId = await this.company(product.supplier)
    return this.resolve('technology_product', key, 'SELECT id FROM technology_product WHERE supplier_id = $1 AND product_name = $2', [
      supplierId,
      product.product_name,
    ])
  }

  private async resolve(table: string, key: string, sql: string, params: unknown[]): Promise<number> {
    const cacheKey = `${table}:${key}`
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const result = await this.client.query<IdRow>(sql, params)
    const row = result.rows[0]
    if (!row) {
      throw new Error(`${table} ${JSON.stringify(key)} is not in the database; run npm run db:seed:reference first`)
    }

    const id = Number(row.id)
    this.cache.set(cacheKey, id)
    return id
  }
}

/** Validation guarantees every referenced key exists, so a miss here is a loader bug. */
function seedRow<T>(rows: Map<string, T>, key: string, table: string): T {
  const row = rows.get(key)
  if (row === undefined) {
    throw new Error(`${table} ${JSON.stringify(key)} is not in the seed files`)
  }
  return row
}

async function insertSite(client: Client, site: Site, regionId: number | null): Promise<number> {
  try {
    // ST_MakePoint is strict, so null coordinates yield a null point (seed-spec §4).
    const result = await client.query<IdRow>(
      `INSERT INTO site (name, country_code, region_id, commodity, mine_status, point_4326)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6::float8, $7::float8), 4326))
       RETURNING id`,
      [site.name, site.country_code, regionId, site.commodity, site.mine_status, site.lng, site.lat],
    )
    const row = result.rows[0]
    if (!row) {
      throw new Error(`site ${site.key}: insert returned no row`)
    }
    return Number(row.id)
  } catch (error) {
    // Validation already checks this against the JSON; the database can still
    // disagree when its region rows are stale.
    if (error instanceof DatabaseError && error.constraint === 'site_region_same_country_fkey') {
      throw new Error(`site ${JSON.stringify(site.key)}: region ${JSON.stringify(site.region)} is not in ${site.country_code} in the database`, {
        cause: error,
      })
    }
    throw error
  }
}

/**
 * Truncates the fixture tables and inserts sites, roles and deployments in
 * file order, so ids are reproducible (seed-spec §6). `company` is shared
 * with the reference catalogue and is upserted, never truncated.
 */
export async function seedFixtures(client: Client, seed: SeedData): Promise<RowCounts> {
  assertFixturesAllowed()

  const { companies, sites, deployments } = seed.fixtures
  const hasSiteAliases = await tableExists(client, 'site_alias')

  await client.query('BEGIN')
  try {
    // site_alias references site, so once 002 creates it, it is truncated too.
    const tables = ['deployment', 'site_company_role', ...(hasSiteAliases ? ['site_alias'] : []), 'site']
    await client.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY`)

    const ids = new ReferenceIds(client, seed)

    const companyIds = new Map<string, number>()
    for (const company of companies) {
      companyIds.set(company.key, await upsertCompany(client, company))
    }

    const siteIds = new Map<string, number>()
    for (const site of sites) {
      const regionId = site.region === null ? null : await ids.region(site.region)
      siteIds.set(site.key, await insertSite(client, site, regionId))
    }

    let roleCount = 0
    for (const site of sites) {
      for (const role of site.roles) {
        // Companies may come from either companies file (seed-spec §5).
        const companyId = companyIds.get(role.company) ?? (await ids.company(role.company))
        await client.query('INSERT INTO site_company_role (site_id, company_id, role) VALUES ($1, $2, $3)', [
          lookup(siteIds, site.key, 'site'),
          companyId,
          role.role,
        ])
        roleCount += 1
      }
    }

    for (const deployment of deployments) {
      await client.query(
        `INSERT INTO deployment
           (site_id, machine_model_id, technology_product_id, quantity, environment,
            commissioning_date, status, verification_status, valid_from, valid_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          lookup(siteIds, deployment.site, 'site'),
          await ids.machineModel(deployment.machine_model),
          deployment.technology_product === null ? null : await ids.technologyProduct(deployment.technology_product),
          deployment.quantity,
          deployment.environment,
          deployment.commissioning_date,
          deployment.status,
          deployment.verification_status,
          deployment.valid_from,
          deployment.valid_to,
        ],
      )
    }

    const companyAliasCount = await upsertAliases(
      client,
      'company_alias',
      companies.map((company) => ({ id: lookup(companyIds, company.key, 'company'), aliases: company.aliases })),
    )
    const siteAliasCount = await upsertAliases(
      client,
      'site_alias',
      sites.map((site) => ({ id: lookup(siteIds, site.key, 'site'), aliases: site.aliases })),
    )

    await client.query('COMMIT')

    const counts: RowCounts = {
      company: companies.length,
      site: sites.length,
      site_company_role: roleCount,
      deployment: deployments.length,
    }
    if (companyAliasCount !== null) {
      counts.company_alias = companyAliasCount
    }
    if (siteAliasCount !== null) {
      counts.site_alias = siteAliasCount
    }
    return counts
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
