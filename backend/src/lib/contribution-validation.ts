import {
  AUTOMATION_LEVELS,
  DEPLOYMENT_STATUSES,
  INSTALLATION_TYPES,
  MACHINE_TYPES,
  MINING_ENVIRONMENTS,
} from './controlled-values.js'

export const MAX_EVIDENCE_URLS = 10

/** Commissioning time at the precision the contributor actually knows (year only or full date). */
export interface Commissioning {
  date: string | null
  year: number
}

export interface ContributionInput {
  siteName: string
  countryCode: string
  coordinates: { latitude: number; longitude: number } | null
  region: string | null
  commodity: string | null
  machineType: string
  machineManufacturer: string
  machineModel: string
  machineModelVariant: string | null
  quantity: number
  environment: string | null
  deploymentStatus: string | null
  automationLevel: string
  installationType: string
  technologySupplier: string
  technologyProduct: string | null
  commissioning: Commissioning | null
  evidenceUrls: string[]
  contributorEmail: string | null
  organisation: string | null
}

export type FieldErrors = Record<string, string>
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Collects field errors while reading a JSON body; null and blank strings count as absent. */
export class FieldReader {
  readonly errors: FieldErrors = {}

  constructor(private readonly body: Record<string, unknown>) {}

  has(field: string): boolean {
    const value = this.body[field]
    return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')
  }

  text(field: string, maxLength: number, required = false): string | null {
    const value = this.body[field]
    if (!this.has(field)) {
      if (required) this.errors[field] = 'is required'
      return null
    }
    if (typeof value !== 'string') {
      this.errors[field] = 'must be a string'
      return null
    }
    const trimmed = value.trim()
    if (trimmed.length > maxLength) {
      this.errors[field] = `must be at most ${maxLength} characters`
      return null
    }
    return trimmed
  }

  coordinate(field: string, minimum: number, maximum: number): number | null {
    const value = this.body[field]
    if (!this.has(field)) return null
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
      this.errors[field] = `must be a number between ${minimum} and ${maximum}`
      return null
    }
    return value
  }

  choice(field: string, allowed: readonly string[], required = false): string | null {
    const value = this.text(field, 100, required)
    if (value !== null && !allowed.includes(value)) {
      this.errors[field] = `must be one of: ${allowed.join(', ')}`
      return null
    }
    return value
  }

  quantity(field: string, required = false): number | null {
    const value = this.body[field]
    if (!this.has(field)) {
      if (required) this.errors[field] = 'is required'
      return null
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value > 100_000) {
      this.errors[field] = 'must be a whole number between 1 and 100000'
      return null
    }
    return value
  }

  commissioning(field: string): Commissioning | null {
    const value = this.text(field, 10)
    if (value === null) return null

    const yearOnly = /^(\d{4})$/.exec(value)
    if (yearOnly) {
      const year = Number(yearOnly[1])
      if (year >= 1900 && year <= 2100) return { date: null, year }
    }

    const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (full) {
      const [year, month, day] = full.slice(1).map(Number) as [number, number, number]
      const parsed = new Date(Date.UTC(year, month - 1, day))
      const realDate = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
      if (realDate && year >= 1900 && year <= 2100) return { date: value, year }
    }

    this.errors[field] = 'must be a year (YYYY) or a date (YYYY-MM-DD)'
    return null
  }

  email(field: string): string | null {
    const value = this.text(field, 254)
    if (value !== null && !EMAIL_PATTERN.test(value)) {
      this.errors[field] = 'must be a valid email address'
      return null
    }
    return value
  }

  /** Distinct http(s) URLs, in submission order. */
  urls(field: string): string[] {
    const value = this.body[field]
    if (value === undefined || value === null) return []
    if (!Array.isArray(value)) {
      this.errors[field] = 'must be an array of URLs'
      return []
    }

    const urls = value
      .filter((item) => !(typeof item === 'string' && item.trim() === ''))
      .map((item) => (typeof item === 'string' ? item.trim() : item))
    if (urls.length > MAX_EVIDENCE_URLS) {
      this.errors[field] = `must contain at most ${MAX_EVIDENCE_URLS} URLs`
      return []
    }
    if (!urls.every((url) => typeof url === 'string' && url.length <= 2000 && isHttpUrl(url))) {
      this.errors[field] = 'must contain only http or https URLs'
      return []
    }
    return [...new Set(urls as string[])]
  }

  /** FR-41: the contributor confirms they may disclose what they submit. */
  disclosure(field: string): void {
    if (this.body[field] !== true) this.errors[field] = 'must be true'
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function asObject(body: unknown): Record<string, unknown> | null {
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null
}

/** Validates a POST /api/contributions body; unknown fields are ignored. */
export function validateContribution(body: unknown): ValidationResult<ContributionInput> {
  const object = asObject(body)
  if (!object) return { ok: false, errors: { body: 'must be a JSON object' } }

  const read = new FieldReader(object)
  const countryCode = read.text('country_code', 2, true)
  if (countryCode !== null && !/^[A-Za-z]{2}$/.test(countryCode)) {
    read.errors.country_code = 'must be a two-letter country code'
  }
  const latitude = read.coordinate('latitude', -90, 90)
  const longitude = read.coordinate('longitude', -180, 180)
  if ((latitude === null) !== (longitude === null)) {
    if (latitude === null && !read.errors.latitude) read.errors.latitude = 'must be given with longitude'
    if (longitude === null && !read.errors.longitude) read.errors.longitude = 'must be given with latitude'
  }

  const input: ContributionInput = {
    siteName: read.text('site_name', 200, true) ?? '',
    countryCode: countryCode?.toUpperCase() ?? '',
    coordinates: latitude !== null && longitude !== null ? { latitude, longitude } : null,
    region: read.text('region', 100),
    commodity: read.text('commodity', 100),
    machineType: read.choice('machine_type', MACHINE_TYPES, true) ?? '',
    machineManufacturer: read.text('machine_manufacturer', 200, true) ?? '',
    machineModel: read.text('machine_model', 200, true) ?? '',
    machineModelVariant: read.text('machine_model_variant', 100),
    quantity: read.quantity('quantity', true) ?? 0,
    environment: read.choice('environment', MINING_ENVIRONMENTS),
    deploymentStatus: read.choice('deployment_status', DEPLOYMENT_STATUSES),
    automationLevel: read.choice('automation_level', AUTOMATION_LEVELS, true) ?? '',
    installationType: read.choice('installation_type', INSTALLATION_TYPES) ?? 'unknown',
    technologySupplier: read.text('technology_supplier', 200, true) ?? '',
    technologyProduct: read.text('technology_product', 200),
    commissioning: read.commissioning('commissioning_date'),
    evidenceUrls: read.urls('evidence_urls'),
    contributorEmail: read.email('contributor_email'),
    organisation: read.text('organisation', 200),
  }
  read.disclosure('disclosure_accepted')

  return Object.keys(read.errors).length > 0 ? { ok: false, errors: read.errors } : { ok: true, value: input }
}
