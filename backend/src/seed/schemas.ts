import { z } from 'zod'

import {
  AUTOMATION_LEVELS,
  COMPANY_ROLES,
  DEPLOYMENT_STATUSES,
  MACHINE_TYPES,
  MINE_STATUSES,
  MINING_ENVIRONMENTS,
  VERIFICATION_STATUSES,
} from '../types.js'

/** Fixed vocabulary for `site.commodity`, which is free text in migration 001 (seed-spec §4). */
export const COMMODITIES = [
  'iron_ore',
  'coal',
  'copper',
  'gold',
  'lithium',
  'nickel',
  'bauxite',
  'oil_sands',
  'platinum_group_metals',
] as const

/** Seed key: lowercase ASCII words joined by single hyphens. Cross-references only; never stored (seed-spec §3). */
const key = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase ASCII words joined by single hyphens')

const text = z.string().min(1, 'must not be empty')

const countryCode = z.string().regex(/^[A-Z]{2}$/, 'must be an uppercase ISO 3166-1 alpha-2 code')

/** `YYYY-MM-DD`; null when unknown. */
const isoDate = z.iso.date()

/** Provenance URL for a reference row. Not stored. */
const source = z.url()

/** BCP-47 language tag: a two- or three-letter primary subtag plus optional subtags (`en`, `zh`, `zh-Latn`). */
const languageTag = z
  .string()
  .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'must be a BCP-47 language tag such as en, zh or zh-Latn')

const aliasSchema = z.strictObject({ alias: text, language: languageTag })
export type Alias = z.infer<typeof aliasSchema>

/** `aliases` may be omitted; it is normalised to an empty array. */
const aliases = z.array(aliasSchema).default([])

export const regionSchema = z.strictObject({
  key,
  name: text,
  country_code: countryCode,
  source: source.optional(),
})
export type Region = z.infer<typeof regionSchema>

const companyShape = { key, name: text, country_code: countryCode.nullable(), aliases }

/** OEMs and technology suppliers are real, so every row cites a source. */
export const referenceCompanySchema = z.strictObject({ ...companyShape, source })
export type ReferenceCompany = z.infer<typeof referenceCompanySchema>

/** Fictional owners, operators and contractors: no source, by definition. */
export const fixtureCompanySchema = z.strictObject(companyShape)
export type FixtureCompany = z.infer<typeof fixtureCompanySchema>

export const machineModelSchema = z
  .strictObject({
    key,
    manufacturer: key,
    model_name: text.nullable(),
    machine_type: z.enum(MACHINE_TYPES),
    size_class: text.nullable(),
    max_payload_tonnes: z.number().positive().nullable(),
    operating_weight_tonnes: z.number().positive().nullable(),
    source: source.optional(),
  })
  .superRefine((model, ctx) => {
    // An unnamed row is the "model unknown" catch-all and has no spec sheet to cite.
    if (model.model_name !== null && model.source === undefined) {
      ctx.addIssue({ code: 'custom', path: ['source'], message: 'a named model must cite a source' })
    }
  })
export type MachineModel = z.infer<typeof machineModelSchema>

export const technologyProductSchema = z.strictObject({
  key,
  supplier: key,
  product_name: text,
  vendor_term: text.nullable(),
  automation_level: z.enum(AUTOMATION_LEVELS).nullable(),
  level_basis: text.nullable(),
  source,
})
export type TechnologyProduct = z.infer<typeof technologyProductSchema>

const siteRoleSchema = z.strictObject({ company: key, role: z.enum(COMPANY_ROLES) })
export type SiteRole = z.infer<typeof siteRoleSchema>

export const siteSchema = z
  .strictObject({
    key,
    name: text,
    country_code: countryCode,
    region: key.nullable(),
    commodity: z.enum(COMMODITIES).nullable(),
    mine_status: z.enum(MINE_STATUSES).nullable(),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    aliases,
    roles: z.array(siteRoleSchema),
  })
  .superRefine((site, ctx) => {
    if ((site.lat === null) !== (site.lng === null)) {
      ctx.addIssue({ code: 'custom', path: ['lat'], message: 'lat and lng must both be set or both be null' })
    }

    // Mirrors site_company_role's UNIQUE (site_id, company_id, role).
    const seen = new Set<string>()
    site.roles.forEach((role, index) => {
      const pair = `${role.company}/${role.role}`
      if (seen.has(pair)) {
        ctx.addIssue({ code: 'custom', path: ['roles', index], message: `duplicate role ${role.role} for company ${role.company}` })
      }
      seen.add(pair)
    })
  })
export type Site = z.infer<typeof siteSchema>

export const deploymentSchema = z
  .strictObject({
    key,
    site: key,
    machine_model: key,
    technology_product: key.nullable(),
    quantity: z.int().positive(),
    environment: z.enum(MINING_ENVIRONMENTS).nullable(),
    commissioning_date: isoDate.nullable(),
    status: z.enum(DEPLOYMENT_STATUSES).nullable(),
    verification_status: z.enum(VERIFICATION_STATUSES),
    valid_from: isoDate.nullable(),
    valid_to: isoDate.nullable(),
  })
  // Mirrors the CHECK constraints in 001, so a bad row is rejected here with
  // its file and key rather than by the database mid-transaction.
  .superRefine((deployment, ctx) => {
    if (deployment.verification_status === 'verified' && deployment.technology_product === null) {
      ctx.addIssue({ code: 'custom', path: ['technology_product'], message: 'a verified deployment must name a technology product' })
    }
    if (deployment.valid_from !== null && deployment.valid_to !== null && deployment.valid_to < deployment.valid_from) {
      ctx.addIssue({ code: 'custom', path: ['valid_to'], message: 'valid_to must not precede valid_from' })
    }
  })
export type Deployment = z.infer<typeof deploymentSchema>
