import { FieldReader, asObject } from './contribution-validation.js'
import type { Commissioning, ValidationResult } from './contribution-validation.js'
import { AUTOMATION_LEVELS, DEPLOYMENT_STATUSES, INSTALLATION_TYPES, MINING_ENVIRONMENTS } from './controlled-values.js'

/** Deployment fields a public correction may change; omitted fields stay as they are. */
export interface DeploymentChanges {
  quantity?: number
  environment?: string
  status?: string
  /** null clears the level; only an administrator's correction can ask for that (FR-57) */
  automationLevel?: string | null
  installationType?: string
  commissioning?: Commissioning
  /** Administrators only (FR-11); the public correction form never sets these, and null clears the date */
  validFrom?: string | null
  validTo?: string | null
}

export interface CorrectionInput {
  changes: DeploymentChanges
  evidenceUrls: string[]
  contributorEmail: string | null
  organisation: string | null
  changeNote: string | null
  /** Site coordinates; read only for a contributor's own update, to supply a location the site lacks (FR-04) */
  coordinates?: { latitude: number; longitude: number } | null
}

/**
 * Validates a PATCH /api/deployments/:id body; null or blank means "leave unchanged".
 * With `coordinates`, as for PATCH /api/contributions/:id, latitude and longitude are read too, together.
 */
export function validateCorrection(body: unknown, options: { coordinates?: boolean } = {}): ValidationResult<CorrectionInput> {
  const object = asObject(body)
  if (!object) return { ok: false, errors: { body: 'must be a JSON object' } }

  const read = new FieldReader(object)
  const changes: DeploymentChanges = {}
  const quantity = read.quantity('quantity')
  const environment = read.choice('environment', MINING_ENVIRONMENTS)
  const status = read.choice('deployment_status', DEPLOYMENT_STATUSES)
  const automationLevel = read.choice('automation_level', AUTOMATION_LEVELS)
  const installationType = read.choice('installation_type', INSTALLATION_TYPES)
  const commissioning = read.commissioning('commissioning_date')

  if (quantity !== null) changes.quantity = quantity
  if (environment !== null) changes.environment = environment
  if (status !== null) changes.status = status
  if (automationLevel !== null) changes.automationLevel = automationLevel
  if (installationType !== null) changes.installationType = installationType
  if (commissioning !== null) changes.commissioning = commissioning

  const input: CorrectionInput = {
    changes,
    evidenceUrls: read.urls('evidence_urls'),
    contributorEmail: read.email('contributor_email'),
    organisation: read.text('organisation', 200),
    changeNote: read.text('change_note', 1000),
  }
  read.disclosure('disclosure_accepted')

  if (options.coordinates) {
    const latitude = read.coordinate('latitude', -90, 90)
    const longitude = read.coordinate('longitude', -180, 180)
    if ((latitude === null) !== (longitude === null)) {
      if (latitude === null && !read.errors.latitude) read.errors.latitude = 'must be given with longitude'
      if (longitude === null && !read.errors.longitude) read.errors.longitude = 'must be given with latitude'
    }
    input.coordinates = latitude !== null && longitude !== null ? { latitude, longitude } : null
  }

  const fieldsGiven = ['quantity', 'environment', 'deployment_status', 'automation_level', 'installation_type', 'commissioning_date', 'evidence_urls', ...(options.coordinates ? ['latitude', 'longitude'] : [])]
    .some((field) => read.has(field))
  if (!fieldsGiven && Object.keys(read.errors).length === 0) {
    read.errors.body = 'must change at least one field or add evidence'
  }

  return Object.keys(read.errors).length > 0 ? { ok: false, errors: read.errors } : { ok: true, value: input }
}
