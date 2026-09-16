import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { z } from 'zod'

import {
  deploymentSchema,
  fixtureCompanySchema,
  machineModelSchema,
  referenceCompanySchema,
  regionSchema,
  siteSchema,
  technologyProductSchema,
  type Alias,
  type Deployment,
  type FixtureCompany,
  type MachineModel,
  type ReferenceCompany,
  type Region,
  type Site,
  type TechnologyProduct,
} from './schemas.js'

export const seedDirectory = fileURLToPath(new URL('../../seed/', import.meta.url))

export type SeedKind = 'reference' | 'fixtures'

const TABLES: Record<SeedKind, readonly string[]> = {
  reference: ['regions', 'companies', 'machine_models', 'technology_products'],
  fixtures: ['companies', 'sites', 'deployments'],
}

/** `<table>.json`, or `<table>.<country>.json` once a table is split by country (seed-spec §2). */
const FILE_PATTERN = /^([a-z_]+?)(?:\.[a-z]{2})?\.json$/

export interface SeedIssue {
  file: string
  key: string
  field: string
  message: string
}

/** Every problem found in the seed files, reported together before any database call. */
export class SeedValidationError extends Error {
  readonly issues: readonly SeedIssue[]

  constructor(issues: readonly SeedIssue[]) {
    super(
      [
        'Seed data is invalid:',
        ...issues.map((issue) => `  ${issue.file} / ${issue.key} / ${issue.field} / ${issue.message}`),
      ].join('\n'),
    )
    this.name = 'SeedValidationError'
    this.issues = issues
  }
}

/** One JSON file as read from disk, before validation. `file` is relative to the seed directory. */
export interface SeedFile {
  file: string
  kind: SeedKind
  table: string
  rows: unknown[]
}

export interface SeedData {
  reference: {
    regions: Region[]
    companies: ReferenceCompany[]
    machineModels: MachineModel[]
    technologyProducts: TechnologyProduct[]
  }
  fixtures: {
    companies: FixtureCompany[]
    sites: Site[]
    deployments: Deployment[]
  }
}

function fileIssue(file: string, message: string): SeedValidationError {
  return new SeedValidationError([{ file, key: '-', field: '-', message }])
}

/** Reads every `<table>[.<country>].json` under the requested kinds, in filename order. */
export async function readSeedFiles(
  kinds: readonly SeedKind[] = ['reference', 'fixtures'],
  directory: string = seedDirectory,
): Promise<SeedFile[]> {
  const files: SeedFile[] = []

  for (const kind of kinds) {
    const kindDirectory = path.join(directory, kind)
    const filenames = (await readdir(kindDirectory)).filter((filename) => filename.endsWith('.json')).sort()

    for (const filename of filenames) {
      const file = `${kind}/${filename}`
      const table = FILE_PATTERN.exec(filename)?.[1]

      if (table === undefined || !TABLES[kind].includes(table)) {
        throw fileIssue(
          file,
          `unexpected file; expected one of ${TABLES[kind].join(', ')}, optionally with a country suffix such as sites.au.json`,
        )
      }

      let rows: unknown
      try {
        rows = JSON.parse(await readFile(path.join(kindDirectory, filename), 'utf8'))
      } catch (error) {
        throw fileIssue(file, `not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
      }

      if (!Array.isArray(rows)) {
        throw fileIssue(file, 'must contain a JSON array of rows')
      }

      files.push({ file, kind, table, rows })
    }
  }

  return files
}

interface Located<T> {
  file: string
  row: T
}

interface Keyed {
  key: string
}

class Issues {
  readonly list: SeedIssue[] = []

  add(file: string, key: string, field: string, message: string): void {
    this.list.push({ file, key, field, message })
  }
}

function rowKey(row: unknown, index: number): string {
  if (typeof row === 'object' && row !== null && 'key' in row && typeof row.key === 'string') {
    return row.key
  }
  return `#${index}`
}

function parseRows<T>(files: SeedFile[], kind: SeedKind, table: string, schema: z.ZodType<T>, issues: Issues): Located<T>[] {
  const rows: Located<T>[] = []

  for (const file of files) {
    if (file.kind !== kind || file.table !== table) continue

    file.rows.forEach((row, index) => {
      const result = schema.safeParse(row)

      if (result.success) {
        rows.push({ file: file.file, row: result.data })
        return
      }

      const key = rowKey(row, index)
      for (const issue of result.error.issues) {
        issues.add(file.file, key, issue.path.map(String).join('.') || '-', issue.message)
      }
    })
  }

  return rows
}

/** Rejects a value that appears twice across a table's files, naming where it was first defined. */
function checkUnique<T extends Keyed>(rows: Located<T>[], field: string, valueOf: (row: T) => string, issues: Issues): void {
  const seen = new Map<string, string>()

  for (const { file, row } of rows) {
    const value = valueOf(row)
    const first = seen.get(value)

    if (first === undefined) {
      seen.set(value, file)
    } else {
      issues.add(file, row.key, field, `duplicate ${field} ${JSON.stringify(value)}; first defined in ${first}`)
    }
  }
}

/** An alias resolves to exactly one entity (seed-spec §9), so it is unique across a table's files. */
function checkUniqueAliases<T extends Keyed & { aliases: Alias[] }>(rows: Located<T>[], issues: Issues): void {
  const seen = new Map<string, string>()

  for (const { file, row } of rows) {
    row.aliases.forEach((alias, index) => {
      const first = seen.get(alias.alias)

      if (first === undefined) {
        seen.set(alias.alias, file)
      } else {
        issues.add(file, row.key, `aliases.${index}.alias`, `duplicate alias ${JSON.stringify(alias.alias)}; first defined in ${first}`)
      }
    })
  }
}

function keys<T extends Keyed>(rows: Located<T>[]): Map<string, T> {
  return new Map(rows.map(({ row }) => [row.key, row]))
}

/**
 * Validates every row, checks keys and natural keys for uniqueness, and
 * resolves every cross-reference to a key. Fails as a whole, listing every
 * problem as `file / key / field / message` (seed-spec §6).
 */
export function validateSeed(files: SeedFile[]): SeedData {
  const issues = new Issues()

  const regions = parseRows(files, 'reference', 'regions', regionSchema, issues)
  const referenceCompanies = parseRows(files, 'reference', 'companies', referenceCompanySchema, issues)
  const machineModels = parseRows(files, 'reference', 'machine_models', machineModelSchema, issues)
  const technologyProducts = parseRows(files, 'reference', 'technology_products', technologyProductSchema, issues)
  const fixtureCompanies = parseRows(files, 'fixtures', 'companies', fixtureCompanySchema, issues)
  const sites = parseRows(files, 'fixtures', 'sites', siteSchema, issues)
  const deployments = parseRows(files, 'fixtures', 'deployments', deploymentSchema, issues)

  // Both companies files feed the one `company` table.
  const companies: Located<ReferenceCompany | FixtureCompany>[] = [...referenceCompanies, ...fixtureCompanies]

  // Keys are unique within a table across all of its files (§3); natural
  // keys are what the database would otherwise reject mid-transaction.
  checkUnique(regions, 'key', (region) => region.key, issues)
  checkUnique(regions, 'name', (region) => `${region.name} (${region.country_code})`, issues)
  checkUnique(companies, 'key', (company) => company.key, issues)
  checkUnique(companies, 'name', (company) => company.name, issues)
  checkUniqueAliases(companies, issues)
  checkUnique(machineModels, 'key', (model) => model.key, issues)
  checkUnique(
    machineModels,
    'model_name',
    (model) => (model.model_name === null ? `${model.manufacturer} unnamed ${model.machine_type}` : `${model.manufacturer} ${model.model_name}`),
    issues,
  )
  checkUnique(technologyProducts, 'key', (product) => product.key, issues)
  checkUnique(technologyProducts, 'product_name', (product) => `${product.supplier} ${product.product_name}`, issues)
  checkUnique(sites, 'key', (site) => site.key, issues)
  checkUniqueAliases(sites, issues)
  checkUnique(deployments, 'key', (deployment) => deployment.key, issues)

  // Every reference resolves to a key in its target table (§3). Manufacturers
  // and suppliers are real companies, so they resolve against reference rows only.
  const regionByKey = keys(regions)
  const referenceCompanyByKey = keys(referenceCompanies)
  const companyByKey = keys(companies)
  const machineModelByKey = keys(machineModels)
  const technologyProductByKey = keys(technologyProducts)
  const siteByKey = keys(sites)

  for (const { file, row: model } of machineModels) {
    if (!referenceCompanyByKey.has(model.manufacturer)) {
      issues.add(file, model.key, 'manufacturer', `unknown reference company key ${JSON.stringify(model.manufacturer)}`)
    }
  }

  for (const { file, row: product } of technologyProducts) {
    if (!referenceCompanyByKey.has(product.supplier)) {
      issues.add(file, product.key, 'supplier', `unknown reference company key ${JSON.stringify(product.supplier)}`)
    }
  }

  for (const { file, row: site } of sites) {
    if (site.region !== null) {
      const region = regionByKey.get(site.region)

      if (region === undefined) {
        issues.add(file, site.key, 'region', `unknown region key ${JSON.stringify(site.region)}`)
      } else if (region.country_code !== site.country_code) {
        // 001 enforces this with a composite foreign key; say it readably here.
        issues.add(file, site.key, 'region', `region ${site.region} is in ${region.country_code} but the site is in ${site.country_code}`)
      }
    }

    site.roles.forEach((role, index) => {
      if (!companyByKey.has(role.company)) {
        issues.add(file, site.key, `roles.${index}.company`, `unknown company key ${JSON.stringify(role.company)}`)
      }
    })
  }

  for (const { file, row: deployment } of deployments) {
    if (!siteByKey.has(deployment.site)) {
      issues.add(file, deployment.key, 'site', `unknown site key ${JSON.stringify(deployment.site)}`)
    }
    if (!machineModelByKey.has(deployment.machine_model)) {
      issues.add(file, deployment.key, 'machine_model', `unknown machine model key ${JSON.stringify(deployment.machine_model)}`)
    }
    if (deployment.technology_product !== null && !technologyProductByKey.has(deployment.technology_product)) {
      issues.add(file, deployment.key, 'technology_product', `unknown technology product key ${JSON.stringify(deployment.technology_product)}`)
    }
  }

  if (issues.list.length > 0) {
    throw new SeedValidationError(issues.list)
  }

  return {
    reference: {
      regions: regions.map(({ row }) => row),
      companies: referenceCompanies.map(({ row }) => row),
      machineModels: machineModels.map(({ row }) => row),
      technologyProducts: technologyProducts.map(({ row }) => row),
    },
    fixtures: {
      companies: fixtureCompanies.map(({ row }) => row),
      sites: sites.map(({ row }) => row),
      deployments: deployments.map(({ row }) => row),
    },
  }
}

/** Reads and validates the seed directory. Fixtures reference the catalogue, so `reference` is always read. */
export async function loadSeed(kinds: readonly SeedKind[] = ['reference', 'fixtures']): Promise<SeedData> {
  return validateSeed(await readSeedFiles(kinds))
}

/** Indexes rows by seed key. */
export function byKey<T extends Keyed>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.key, row]))
}
