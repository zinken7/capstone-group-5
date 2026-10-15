import { withTransaction } from '../database.js'
import { keyMatches } from '../lib/contribution-key.js'
import type { CorrectionInput } from '../lib/correction-validation.js'
import {
  findEvidenceUrls,
  insertContributor,
  insertEvidence,
  insertRevision,
  lockDeployment,
  updateDeploymentForReview,
  updateSiteCoordinates,
} from '../repositories/contributions.js'
import { findContributionDetail, findContributionSummaries, findKeyHash, findSubmitter } from '../repositories/contributor-access.js'
import type { ContributionDetailRow, ContributionSummaryRow } from '../repositories/contributor-access.js'
import { alignValidity, commissioningValue, diffChanges, windowOrdered } from './corrections.js'

/** What a contributor sees of their own submission (FR-59): never the key or its hash. */
export interface ContributionSummary {
  id: number
  verification_status: string
  site_id: number
  site_name: string
  country_code: string
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  quantity: number
  submitted_at: string
  updated_at: string
  /** The latest decision on the record itself, with the note the administrator wrote for the contributor */
  decision: { decision: string; note: string | null; decided_at: string } | null
}

export interface ContributionDetail extends ContributionSummary {
  /** The site's location; null when it has none, which approval needs */
  latitude: number | null
  longitude: number | null
  environment: string | null
  deployment_status: string | null
  automation_level: string
  installation_type: string
  /** A date, or the year alone when only the year is known */
  commissioning_date: string | null
  evidence_urls: string[]
}

function toSummary(row: ContributionSummaryRow): ContributionSummary {
  return {
    id: row.id,
    verification_status: row.verification_status,
    site_id: row.site_id,
    site_name: row.site_name,
    country_code: row.country_code,
    machine_manufacturer: row.machine_manufacturer,
    machine_model: row.machine_model,
    machine_type: row.machine_type,
    quantity: row.quantity,
    submitted_at: row.submitted_at,
    updated_at: row.updated_at,
    decision: row.decision === null || row.decided_at === null
      ? null
      : { decision: row.decision, note: row.decision_note, decided_at: row.decided_at },
  }
}

function toDetail(row: ContributionDetailRow): ContributionDetail {
  return {
    ...toSummary(row),
    latitude: row.latitude,
    longitude: row.longitude,
    environment: row.environment,
    deployment_status: row.deployment_status,
    automation_level: row.automation_level,
    installation_type: row.installation_type,
    commissioning_date: commissioningValue(row.commissioning_date, row.commissioning_year),
    evidence_urls: row.evidence_urls,
  }
}

/** The status of each submission whose key matches; any other pair is left out, unexplained. */
export async function checkStatuses(pairs: readonly { id: number; key: string }[]): Promise<ContributionSummary[]> {
  const rows = await findContributionSummaries([...new Set(pairs.map((pair) => pair.id))])
  return rows
    .filter((row) => pairs.some((pair) => pair.id === row.id && keyMatches(pair.key, row.key_hash)))
    .map(toSummary)
}

/** One submission, when the key matches; null otherwise, whether or not the record exists. */
export async function readOwnContribution(id: number, key: string): Promise<ContributionDetail | null> {
  const row = await findContributionDetail(id)
  return row && keyMatches(key, row.key_hash) ? toDetail(row) : null
}

export type OwnUpdateOutcome =
  | { kind: 'not_found' }
  | { kind: 'not_open'; verificationStatus: string }
  | { kind: 'unchanged' }
  | { kind: 'invalid_window' }
  | { kind: 'site_located' }
  | { kind: 'updated'; id: number; verificationStatus: string }

/**
 * A contributor answers a request for changes (FR-46, FR-59): the change is
 * applied to their own record, the previous values go into an update
 * revision attributed to them (FR-47), and the record returns to pending review.
 */
export async function updateOwnContribution(id: number, key: string, input: CorrectionInput): Promise<OwnUpdateOutcome> {
  return withTransaction(async (tx) => {
    const current = await lockDeployment(tx, id)
    if (!current || !keyMatches(key, await findKeyHash(tx, id))) return { kind: 'not_found' }
    if (current.verificationStatus !== 'changes_requested') return { kind: 'not_open', verificationStatus: current.verificationStatus }

    // A site is shared by every deployment at it, so a contributor may only supply a location it lacks
    const coordinates = input.coordinates ?? null
    if (coordinates && current.siteLatitude !== null) return { kind: 'site_located' }

    const { previous, updates } = diffChanges(current, input.changes)
    const existingUrls = await findEvidenceUrls(tx, id)
    const newUrls = input.evidenceUrls.filter((url) => !existingUrls.includes(url))
    if (Object.keys(previous).length === 0 && newUrls.length === 0 && !coordinates) return { kind: 'unchanged' }
    alignValidity(current, { previous, updates })
    if (!windowOrdered(current, updates)) return { kind: 'invalid_window' }

    // The original submission names the contributor; a record without one still needs an actor
    const contributorId = await findSubmitter(tx, id)
      ?? await insertContributor(tx, { email: null, organisation: null })
    if (newUrls.length > 0) previous.evidence_urls = existingUrls
    if (coordinates) {
      previous.latitude = null
      previous.longitude = null
    }
    previous.verification_status = current.verificationStatus
    await insertRevision(tx, {
      deploymentId: id,
      contributorId,
      action: 'update',
      previousValues: previous,
      changeNote: input.changeNote,
    })
    const verificationStatus = await updateDeploymentForReview(tx, id, updates)
    if (coordinates) await updateSiteCoordinates(tx, current.siteId, coordinates)
    await insertEvidence(tx, id, newUrls)
    return { kind: 'updated', id, verificationStatus }
  })
}
