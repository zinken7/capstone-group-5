import type { Queryable } from '../database.js'

type IdRow = { id: number }

async function firstId(tx: Queryable, text: string, params: readonly unknown[]): Promise<number | null> {
  const rows = await tx.query<IdRow>(text, params)
  return rows[0]?.id ?? null
}

async function requireId(tx: Queryable, text: string, params: readonly unknown[]): Promise<number> {
  const id = await firstId(tx, text, params)
  if (id === null) throw new Error('Insert returned no id')
  return id
}

/** Reuses a company whose name matches case-insensitively, otherwise creates it. */
export async function findOrCreateCompany(tx: Queryable, name: string): Promise<number> {
  const existing = await firstId(tx, 'SELECT id::int AS id FROM company WHERE lower(name) = lower($1) ORDER BY id LIMIT 1', [name])
  if (existing !== null) return existing

  return requireId(
    tx,
    `INSERT INTO company (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = company.name
     RETURNING id::int AS id`,
    [name],
  )
}

export async function findOrCreateRegion(tx: Queryable, name: string, countryCode: string): Promise<number> {
  const existing = await firstId(
    tx,
    'SELECT id::int AS id FROM region WHERE lower(name) = lower($1) AND country_code = $2 ORDER BY id LIMIT 1',
    [name, countryCode],
  )
  if (existing !== null) return existing

  return requireId(
    tx,
    `INSERT INTO region (name, country_code) VALUES ($1, $2)
     ON CONFLICT (name, country_code) DO UPDATE SET name = region.name
     RETURNING id::int AS id`,
    [name, countryCode],
  )
}

/** Sites have no natural key, so a same-name site in the same country is treated as the same site. */
export async function findOrCreateSite(
  tx: Queryable,
  site: { name: string; countryCode: string; regionId: number | null; commodity: string | null },
): Promise<number> {
  const existing = await firstId(
    tx,
    'SELECT id::int AS id FROM site WHERE lower(name) = lower($1) AND country_code = $2 ORDER BY id LIMIT 1',
    [site.name, site.countryCode],
  )
  if (existing !== null) return existing

  return requireId(
    tx,
    `INSERT INTO site (name, country_code, region_id, commodity) VALUES ($1, $2, $3, $4)
     RETURNING id::int AS id`,
    [site.name, site.countryCode, site.regionId, site.commodity],
  )
}

/** Matches on manufacturer, model name (or machine type when unnamed) and variant, as the unique indexes do. */
export async function findOrCreateMachineModel(
  tx: Queryable,
  model: { manufacturerId: number; modelName: string | null; variant: string; machineType: string },
): Promise<number> {
  const existing = model.modelName === null
    ? await firstId(
      tx,
      `SELECT id::int AS id FROM machine_model
       WHERE manufacturer_id = $1 AND model_name IS NULL AND machine_type::text = $2 AND lower(model_variant) = lower($3)
       ORDER BY id LIMIT 1`,
      [model.manufacturerId, model.machineType, model.variant],
    )
    : await firstId(
      tx,
      `SELECT id::int AS id FROM machine_model
       WHERE manufacturer_id = $1 AND lower(model_name) = lower($2) AND lower(model_variant) = lower($3)
       ORDER BY id LIMIT 1`,
      [model.manufacturerId, model.modelName, model.variant],
    )
  if (existing !== null) return existing

  return requireId(
    tx,
    `INSERT INTO machine_model (manufacturer_id, model_name, model_variant, machine_type)
     VALUES ($1, $2, $3, $4::machine_type)
     RETURNING id::int AS id`,
    [model.manufacturerId, model.modelName, model.variant, model.machineType],
  )
}

/** New products start unclassified: the automation level on a product is assigned by an administrator. */
export async function findOrCreateTechnologyProduct(tx: Queryable, supplierId: number, productName: string): Promise<number> {
  const existing = await firstId(
    tx,
    'SELECT id::int AS id FROM technology_product WHERE supplier_id = $1 AND lower(product_name) = lower($2) ORDER BY id LIMIT 1',
    [supplierId, productName],
  )
  if (existing !== null) return existing

  return requireId(
    tx,
    `INSERT INTO technology_product (supplier_id, product_name) VALUES ($1, $2)
     ON CONFLICT (supplier_id, product_name) DO UPDATE SET product_name = technology_product.product_name
     RETURNING id::int AS id`,
    [supplierId, productName],
  )
}

export async function insertContributor(tx: Queryable, contributor: { email: string | null; organisation: string | null }): Promise<number> {
  return requireId(
    tx,
    'INSERT INTO contributor (email, organisation) VALUES ($1, $2) RETURNING id::int AS id',
    [contributor.email, contributor.organisation],
  )
}

export interface NewDeployment {
  siteId: number
  machineModelId: number
  technologyProductId: number | null
  quantity: number
  environment: string | null
  status: string | null
  automationLevel: string | null
  installationType: string
  commissioningDate: string | null
  commissioningYear: number | null
}

/** New submissions wait for an administrator, so they start as pending_review. */
export async function insertDeployment(tx: Queryable, deployment: NewDeployment): Promise<{ id: number; verificationStatus: string }> {
  const rows = await tx.query<{ id: number; verification_status: string }>(
    `
    INSERT INTO deployment (
      site_id, machine_model_id, technology_product_id, quantity, environment, status,
      automation_level, installation_type, commissioning_date, commissioning_year,
      valid_from, verification_status
    ) VALUES (
      $1, $2, $3, $4, $5::mining_environment, $6::deployment_status,
      $7::automation_level, $8::installation_type, $9::date, $10,
      $9::date, 'pending_review'
    )
    RETURNING id::int AS id, verification_status::text AS verification_status
    `,
    [
      deployment.siteId,
      deployment.machineModelId,
      deployment.technologyProductId,
      deployment.quantity,
      deployment.environment,
      deployment.status,
      deployment.automationLevel,
      deployment.installationType,
      deployment.commissioningDate,
      deployment.commissioningYear,
    ],
  )
  const row = rows[0]
  if (!row) throw new Error('Insert returned no deployment')
  return { id: row.id, verificationStatus: row.verification_status }
}

/** Adds evidence URLs, skipping any already attached to the deployment. */
export async function insertEvidence(tx: Queryable, deploymentId: number, urls: readonly string[]): Promise<void> {
  for (const url of urls) {
    await tx.query(
      `INSERT INTO evidence (deployment_id, url, source_type) VALUES ($1, $2, 'other')
       ON CONFLICT (deployment_id, url) DO NOTHING`,
      [deploymentId, url],
    )
  }
}

export async function insertRevision(
  tx: Queryable,
  revision: {
    deploymentId: number
    contributorId: number | null
    action: 'create' | 'update'
    previousValues: Record<string, unknown>
    changeNote: string | null
  },
): Promise<void> {
  await tx.query(
    `INSERT INTO revision (deployment_id, contributor_id, action, previous_values, change_note)
     VALUES ($1, $2, $3::revision_action, $4::jsonb, $5)`,
    [revision.deploymentId, revision.contributorId, revision.action, JSON.stringify(revision.previousValues), revision.changeNote],
  )
}
