import { FieldReader, asObject } from './contribution-validation.js'
import type { ValidationResult } from './contribution-validation.js'
import type { DeploymentChanges } from './correction-validation.js'
import { AUTOMATION_LEVELS, DEPLOYMENT_STATUSES, INSTALLATION_TYPES, MINING_ENVIRONMENTS } from './controlled-values.js'

export const REVIEW_DECISIONS = ['approved', 'rejected', 'needs_changes'] as const
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]

export interface ReviewInput {
  decision: ReviewDecision
  note: string | null
}

/** Validates a POST /api/admin/deployments/:id/reviews body; a note is required unless approving. */
export function validateReview(body: unknown): ValidationResult<ReviewInput> {
  const object = asObject(body)
  if (!object) return { ok: false, errors: { body: 'must be a JSON object' } }

  const read = new FieldReader(object)
  const decision = read.choice('decision', REVIEW_DECISIONS, true) as ReviewDecision | null
  const note = read.text('note', 2000)
  if (decision !== null && decision !== 'approved' && note === null && !read.errors.note) {
    read.errors.note = 'is required when rejecting or requesting changes'
  }

  return decision === null || Object.keys(read.errors).length > 0
    ? { ok: false, errors: read.errors }
    : { ok: true, value: { decision, note } }
}

export interface AdminCorrectionInput {
  changes: DeploymentChanges
  coordinates: { latitude: number; longitude: number } | null
  technology: { supplier: string; product: string | null } | null
  evidenceUrls: string[]
  changeNote: string | null
}

/**
 * Validates a PATCH /api/admin/deployments/:id body: the public correction
 * fields, plus the technology supplier and, optionally, a product of that
 * supplier. No contributor details or disclosure.
 */
export function validateAdminCorrection(body: unknown): ValidationResult<AdminCorrectionInput> {
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
  const latitude = read.coordinate('latitude', -90, 90)
  const longitude = read.coordinate('longitude', -180, 180)
  if ((latitude === null) !== (longitude === null)) {
    if (latitude === null && !read.errors.latitude) read.errors.latitude = 'must be given with longitude'
    if (longitude === null && !read.errors.longitude) read.errors.longitude = 'must be given with latitude'
  }
  if (quantity !== null) changes.quantity = quantity
  if (environment !== null) changes.environment = environment
  if (status !== null) changes.status = status
  if (automationLevel !== null) changes.automationLevel = automationLevel
  const clearLevel = object.clear_automation_level
  if (clearLevel !== undefined && typeof clearLevel !== 'boolean') {
    read.errors.clear_automation_level = 'must be true or false'
  } else if (clearLevel === true) {
    // Migration 005 makes the level required on every deployment, so it can be corrected but not cleared
    read.errors.clear_automation_level = 'cannot clear a required automation level'
  }
  if (installationType !== null) changes.installationType = installationType
  if (commissioning !== null) changes.commissioning = commissioning

  const supplier = read.text('technology_supplier', 200)
  const product = read.text('technology_product', 200)
  if (product !== null && supplier === null) {
    read.errors.technology_supplier = 'is required when technology_product is given'
  }

  const input: AdminCorrectionInput = {
    changes,
    coordinates: latitude !== null && longitude !== null ? { latitude, longitude } : null,
    technology: supplier !== null ? { supplier, product } : null,
    evidenceUrls: read.urls('evidence_urls'),
    changeNote: read.text('change_note', 1000),
  }

  const fieldsGiven = [
    'quantity', 'environment', 'deployment_status', 'automation_level', 'installation_type',
    'commissioning_date', 'latitude', 'longitude', 'technology_supplier', 'technology_product', 'evidence_urls',
  ].some((field) => read.has(field)) || clearLevel === true
  if (!fieldsGiven && Object.keys(read.errors).length === 0) {
    read.errors.body = 'must change at least one field or add evidence'
  }

  return Object.keys(read.errors).length > 0 ? { ok: false, errors: read.errors } : { ok: true, value: input }
}

/** Validates a POST /api/admin/users body. Any role in the body is ignored: the API only creates administrators. */
export function validateNewAdministrator(body: unknown): ValidationResult<{ email: string }> {
  const object = asObject(body)
  if (!object) return { ok: false, errors: { body: 'must be a JSON object' } }

  const read = new FieldReader(object)
  const email = read.email('email')
  if (email === null && !read.errors.email) read.errors.email = 'is required'
  return email === null || Object.keys(read.errors).length > 0
    ? { ok: false, errors: read.errors }
    : { ok: true, value: { email } }
}

/** Validates a PATCH /api/admin/users/:id body. */
export function validateAccountChange(body: unknown): ValidationResult<{ active: boolean }> {
  const object = asObject(body)
  if (!object || typeof object.active !== 'boolean') return { ok: false, errors: { active: 'must be true or false' } }
  return { ok: true, value: { active: object.active } }
}
