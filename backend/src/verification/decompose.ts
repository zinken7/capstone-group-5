import type { ClaimField, CompanyRole, MachineType } from './types.js'

/**
 * Stage 2 — decompose (docs/verification/fr55-design.md §6 stage 2).
 *
 * Form fields become sub-facts from the fixed table below (§6.1), one
 * hypothesis sentence each. Null fields produce no sub-facts. The table is
 * the plain-English definition of what a source must say before a field is
 * called supported; it is data for the client to confirm (design §10), so it
 * lives here as one declarative constant rather than scattered logic.
 */

/** The checkable content of one submission. The site name is the only hard requirement: without it no hypothesis can be formed. */
export interface Submission {
  site: { name: string; countryCode: string; region: string | null }
  companyRoles: ReadonlyArray<{ company: string; role: CompanyRole }>
  machine: { manufacturer: string | null; machineType: MachineType | null; modelName: string | null } | null
  technology: { supplier: string | null; productName: string | null } | null
  quantity: number | null
  commissioning: { year: number; month: number | null } | null
}

export interface SubFactClaim {
  field: ClaimField
  /**
   * Which instance of the field the claim is about, for multi-instance
   * fields — '{company}:{role}' for company_role, '' elsewhere. Part of the
   * claim's identity (migration 003's unique key includes it).
   */
  subject: string
  subFact: string
  required: boolean
  hypothesis: string
  /** Entity terms for stage 3's BM25 query (design §6 stage 3). */
  terms: string[]
}

interface SubFactInstance {
  subject: string
  hypothesis: string
  terms: string[]
}

interface SubFactSpec {
  field: ClaimField
  subFact: string
  required: boolean
  /** Returns no instances when the submission lacks the values this sub-fact needs. */
  instances: (submission: Submission) => SubFactInstance[]
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** How each machine type reads in a hypothesis sentence. */
const TYPE_NAMES: Record<MachineType, string> = {
  haul_truck: 'haul truck',
  lhd: 'LHD',
  loader: 'loader',
  dozer: 'dozer',
  excavator: 'excavator',
  drill: 'drill',
  scaler: 'scaler',
  shotcrete_machine: 'shotcrete machine',
  other: 'machine',
}

// Retrieval vocabularies: the surface forms a source is likely to use for a
// role or machine type. These are query terms only; they never appear in a
// hypothesis.

const ROLE_TERMS: Record<CompanyRole, string[]> = {
  owner: ['owner', 'owners', 'owns', 'owned', 'ownership'],
  operator: ['operator', 'operators', 'operates', 'operated'],
  contractor: ['contractor', 'contractors', 'contract'],
}

const TYPE_TERMS: Record<MachineType, string[]> = {
  haul_truck: ['haul', 'trucks', 'truck', 'haulage'],
  lhd: ['lhd', 'lhds', 'loader', 'loaders'],
  loader: ['loader', 'loaders', 'loading'],
  dozer: ['dozer', 'dozers', 'bulldozer'],
  excavator: ['excavator', 'excavators'],
  drill: ['drill', 'drills', 'drilling'],
  scaler: ['scaler', 'scalers', 'scaling'],
  shotcrete_machine: ['shotcrete'],
  other: [],
}

const regionDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** 'AU' → 'Australia'; falls back to the code when ICU does not know it. */
function countryName(code: string): string {
  try {
    return regionDisplayNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

function one(instance: SubFactInstance | null): SubFactInstance[] {
  return instance === null ? [] : [instance]
}

/**
 * The §6.1 table. Two readings differ from the doc's wording, both
 * deliberate: "at this site" is structural (every quantity hypothesis names
 * the site) rather than a separate sub-fact, and site name/country are
 * separate hypotheses so a source that names the site without placing it
 * still supports something (design R2).
 */
export const SUB_FACT_TABLE: readonly SubFactSpec[] = [
  {
    field: 'site',
    subFact: 'name',
    required: true,
    instances: ({ site }) =>
      one({ subject: '', hypothesis: `There is a mine site named ${site.name}.`, terms: [site.name] }),
  },
  {
    field: 'site',
    subFact: 'country',
    required: true,
    instances: ({ site }) =>
      one({
        subject: '',
        hypothesis: `The ${site.name} mine site is in ${countryName(site.countryCode)}.`,
        terms: [site.name, countryName(site.countryCode)],
      }),
  },
  {
    field: 'site',
    subFact: 'region',
    required: false,
    instances: ({ site }) =>
      one(
        site.region === null
          ? null
          : {
              subject: '',
              hypothesis: `The ${site.name} mine site is in the ${site.region} region.`,
              terms: [site.name, site.region],
            },
      ),
  },
  {
    field: 'company_role',
    subFact: 'company_named',
    required: true,
    instances: ({ site, companyRoles }) =>
      companyRoles.map(({ company, role }) => ({
        subject: `${company.toLowerCase()}:${role}`,
        hypothesis: `${company} is associated with the ${site.name} mine site.`,
        terms: [company, site.name],
      })),
  },
  {
    field: 'company_role',
    subFact: 'role_stated',
    required: true,
    instances: ({ site, companyRoles }) =>
      companyRoles.map(({ company, role }) => ({
        subject: `${company.toLowerCase()}:${role}`,
        hypothesis: `${company} is the ${role} of the ${site.name} mine site.`,
        terms: [company, ...ROLE_TERMS[role]],
      })),
  },
  {
    field: 'machine',
    subFact: 'manufacturer',
    required: true,
    instances: ({ site, machine }) =>
      one(
        machine?.manufacturer == null
          ? null
          : {
              subject: '',
              hypothesis: `The ${site.name} mine site operates ${machine.manufacturer} machines.`,
              // The manufacturer alone: the page is already about the site, so
              // site-name tokens only crowd out the machine sentence.
              terms: [machine.manufacturer],
            },
      ),
  },
  {
    field: 'machine',
    subFact: 'machine_type',
    required: true,
    instances: ({ site, machine }) =>
      one(
        machine?.machineType == null
          ? null
          : {
              subject: '',
              hypothesis:
                machine.manufacturer === null
                  ? `The ${site.name} mine site operates ${TYPE_NAMES[machine.machineType]}s.`
                  : `The ${site.name} mine site operates ${machine.manufacturer} ${TYPE_NAMES[machine.machineType]}s.`,
              terms: [...(machine.manufacturer === null ? [] : [machine.manufacturer]), ...TYPE_TERMS[machine.machineType]],
            },
      ),
  },
  {
    field: 'machine',
    subFact: 'model_name',
    required: false,
    instances: ({ site, machine }) =>
      one(
        machine?.modelName == null
          ? null
          : {
              subject: '',
              hypothesis:
                machine.manufacturer === null
                  ? `The ${site.name} mine site operates ${machine.modelName} machines.`
                  : `The ${site.name} mine site operates ${machine.manufacturer} ${machine.modelName} machines.`,
              terms: [...(machine.manufacturer === null ? [] : [machine.manufacturer]), machine.modelName],
            },
      ),
  },
  {
    field: 'technology',
    subFact: 'supplier_named',
    required: true,
    instances: ({ site, technology }) =>
      one(
        technology?.supplier == null
          ? null
          : {
              subject: '',
              hypothesis: `The ${site.name} mine site uses automation technology supplied by ${technology.supplier}.`,
              terms: [technology.supplier, 'automation', 'autonomous'],
            },
      ),
  },
  {
    field: 'technology',
    subFact: 'product_name',
    required: false,
    instances: ({ site, technology }) =>
      one(
        technology?.productName == null
          ? null
          : {
              subject: '',
              hypothesis: `The ${site.name} mine site uses the product ${technology.productName}.`,
              terms: [technology.productName],
            },
      ),
  },
  {
    field: 'quantity',
    subFact: 'count',
    required: true,
    instances: ({ site, machine, quantity }) =>
      one(
        quantity === null
          ? null
          : {
              subject: '',
              hypothesis: `The ${site.name} mine site has ${quantity} machines.`,
              terms: [site.name, String(quantity), ...(machine?.machineType == null ? [] : TYPE_TERMS[machine.machineType])],
            },
      ),
  },
  {
    field: 'quantity',
    subFact: 'machine_type_matches',
    required: false,
    instances: ({ site, machine, quantity }) =>
      one(
        quantity === null || machine?.machineType == null
          ? null
          : {
              subject: '',
              hypothesis: `The ${site.name} mine site has ${quantity} ${TYPE_NAMES[machine.machineType]}s.`,
              terms: [String(quantity), ...TYPE_TERMS[machine.machineType]],
            },
      ),
  },
  {
    field: 'commissioning',
    subFact: 'year',
    required: true,
    instances: ({ site, commissioning }) =>
      one(
        commissioning === null
          ? null
          : {
              subject: '',
              hypothesis: `The deployment at ${site.name} began in ${commissioning.year}.`,
              terms: [String(commissioning.year), 'commissioned', 'began', 'deployed', 'introduced', 'since'],
            },
      ),
  },
  {
    field: 'commissioning',
    subFact: 'month',
    required: false,
    instances: ({ site, commissioning }) =>
      one(
        commissioning === null || commissioning.month === null
          ? null
          : {
              subject: '',
              hypothesis: `The deployment at ${site.name} began in ${MONTH_NAMES[commissioning.month - 1] ?? commissioning.month} ${commissioning.year}.`,
              terms: [String(MONTH_NAMES[commissioning.month - 1] ?? commissioning.month), String(commissioning.year)],
            },
      ),
  },
]

export function decompose(submission: Submission): SubFactClaim[] {
  return SUB_FACT_TABLE.flatMap((spec) =>
    spec.instances(submission).map((instance) => ({
      field: spec.field,
      subFact: spec.subFact,
      required: spec.required,
      ...instance,
    })),
  )
}
