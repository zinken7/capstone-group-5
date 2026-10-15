import { keyMatches } from '../lib/contribution-key.js'
import { findCorrectionsForTracking } from '../repositories/corrections.js'
import type { CorrectionTrackingRow } from '../repositories/corrections.js'
import { findRegisterRows } from '../repositories/deployments.js'
import type { RegisterRow } from '../repositories/deployments.js'

/** What a proposer sees of their own correction (FR-59, #223): never the key or its hash. */
export interface CorrectionTracking {
  id: number
  deployment_id: number
  /** pending, approved, rejected or needs_changes */
  status: string
  submitted_at: string
  site_id: number
  site_name: string
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  change_note: string | null
  evidence_urls: string[]
  /** Each proposed field with its value when the correction was sent */
  changes: { field: string; before: unknown; proposed: unknown }[]
  /** The latest decision on the correction, with the note the administrator wrote for the proposer */
  decision: { decision: string; note: string | null; decided_at: string } | null
}

function toTracking(row: CorrectionTrackingRow): CorrectionTracking {
  return {
    id: row.id,
    deployment_id: row.deployment_id,
    status: row.status,
    submitted_at: row.submitted_at,
    site_id: row.site_id,
    site_name: row.site_name,
    machine_manufacturer: row.machine_manufacturer,
    machine_model: row.machine_model,
    machine_type: row.machine_type,
    change_note: row.change_note,
    evidence_urls: row.evidence_urls,
    changes: Object.entries(row.proposed_values).map(([field, proposed]) => ({ field, before: row.base_values[field] ?? null, proposed })),
    decision: row.decision === null || row.decided_at === null
      ? null
      : { decision: row.decision, note: row.decision_note, decided_at: row.decided_at },
  }
}

/** The status of each correction whose key matches; any other pair is left out, unexplained. */
export async function checkCorrectionStatuses(pairs: readonly { id: number; key: string }[]): Promise<CorrectionTracking[]> {
  const rows = await findCorrectionsForTracking([...new Set(pairs.map((pair) => pair.id))])
  return rows
    .filter((row) => pairs.some((pair) => pair.id === row.id && keyMatches(pair.key, row.key_hash)))
    .map(toTracking)
}

/** One correction when the key matches, with the record as the register shows it, to propose again from. */
export async function readOwnCorrection(id: number, key: string): Promise<(CorrectionTracking & { record: RegisterRow | null }) | null> {
  const [row] = await findCorrectionsForTracking([id])
  if (!row || !keyMatches(key, row.key_hash)) return null
  const [record] = await findRegisterRows({ deploymentId: row.deployment_id }, { sort: 'site', order: 'asc', page: { limit: 1, offset: 0 } })
  return { ...toTracking(row), record: record ?? null }
}
