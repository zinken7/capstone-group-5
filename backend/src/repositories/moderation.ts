import { query } from '../database.js'
import type { Queryable } from '../database.js'

// All moderation SQL lives here, so it can move to Drizzle (#71) in one place.

export interface QueueItem {
  id: number
  site_name: string
  country_code: string
  region: string | null
  machine_manufacturer: string
  machine_model: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  evidence_count: number
  submitted_at: string
}

const recordJoins = `
  FROM deployment d
  JOIN site s ON s.id = d.site_id
  LEFT JOIN region r ON r.id = s.region_id
  JOIN machine_model m ON m.id = d.machine_model_id
  JOIN company mc ON mc.id = m.manufacturer_id
  LEFT JOIN technology_product p ON p.id = d.technology_product_id
  LEFT JOIN company sc ON sc.id = p.supplier_id
`

/** Records waiting for a decision, least recently changed first. */
export async function listPendingReviews(): Promise<QueueItem[]> {
  return query<QueueItem>(`
    SELECT
      d.id::int AS id, s.name AS site_name, s.country_code, r.name AS region,
      mc.name AS machine_manufacturer, m.model_name AS machine_model, m.machine_type::text AS machine_type,
      d.quantity, sc.name AS technology_supplier, p.product_name AS technology_product,
      (SELECT COUNT(*)::int FROM evidence e WHERE e.deployment_id = d.id) AS evidence_count,
      d.updated_at AS submitted_at
    ${recordJoins}
    WHERE d.verification_status = 'pending_review'
    ORDER BY d.updated_at, d.id
  `)
}

export interface ReviewRecord {
  id: number
  verification_status: string
  site_id: number
  site_name: string
  country_code: string
  region: string | null
  commodity: string | null
  machine_manufacturer: string
  machine_model: string | null
  model_variant: string | null
  machine_type: string
  quantity: number
  technology_supplier: string | null
  technology_product: string | null
  automation_level: string | null
  environment: string | null
  installation_type: string
  status: string | null
  commissioning_date: string | null
  commissioning_year: number | null
  valid_from: string | null
  valid_to: string | null
  created_at: string
  updated_at: string
  evidence: { url: string; source_type: string; publisher: string | null; published_date: string | null }[]
  reviews: { decision: string; note: string | null; administrator: string; reviewed_at: string }[]
  revisions: {
    action: string
    previous_values: Record<string, unknown> | null
    change_note: string | null
    contributor_email: string | null
    contributor_organisation: string | null
    administrator: string | null
    changed_at: string
  }[]
}

/** One record in any verification status, with its evidence and full history. */
export async function findReviewRecord(id: number): Promise<ReviewRecord | null> {
  const rows = await query<Omit<ReviewRecord, 'evidence' | 'reviews' | 'revisions'>>(`
    SELECT
      d.id::int AS id, d.verification_status::text AS verification_status,
      s.id::int AS site_id, s.name AS site_name, s.country_code, r.name AS region, s.commodity,
      mc.name AS machine_manufacturer, m.model_name AS machine_model, m.model_variant,
      m.machine_type::text AS machine_type, d.quantity,
      sc.name AS technology_supplier, p.product_name AS technology_product,
      d.automation_level::text AS automation_level, d.environment::text AS environment,
      d.installation_type::text AS installation_type, d.status::text AS status,
      d.commissioning_date::text AS commissioning_date, d.commissioning_year::int AS commissioning_year,
      d.valid_from::text AS valid_from, d.valid_to::text AS valid_to,
      d.created_at, d.updated_at
    ${recordJoins}
    WHERE d.id = $1
  `, [id])
  const record = rows[0]
  if (!record) return null

  const [evidence, reviews, revisions] = await Promise.all([
    query<ReviewRecord['evidence'][number]>(`
      SELECT url, source_type::text AS source_type, publisher, published_date::text AS published_date
      FROM evidence WHERE deployment_id = $1 ORDER BY id
    `, [id]),
    query<ReviewRecord['reviews'][number]>(`
      SELECT v.decision::text AS decision, v.review_note AS note, a.email AS administrator, v.reviewed_at
      FROM verification_review v JOIN admin_user a ON a.id = v.admin_user_id
      WHERE v.deployment_id = $1 ORDER BY v.reviewed_at, v.id
    `, [id]),
    query<ReviewRecord['revisions'][number]>(`
      SELECT
        rv.action::text AS action, rv.previous_values, rv.change_note,
        c.email AS contributor_email, c.organisation AS contributor_organisation,
        a.email AS administrator, rv.changed_at
      FROM revision rv
      LEFT JOIN contributor c ON c.id = rv.contributor_id
      LEFT JOIN admin_user a ON a.id = rv.admin_user_id
      WHERE rv.deployment_id = $1 ORDER BY rv.changed_at, rv.id
    `, [id]),
  ])
  return { ...record, evidence, reviews, revisions }
}

/** Locks the record for a decision and returns what the decision rules need. */
export async function lockDecisionState(tx: Queryable, id: number): Promise<{
  verificationStatus: string
  technologyProductId: number | null
  evidenceCount: number
} | null> {
  const rows = await tx.query<{ verification_status: string; technology_product_id: number | null; evidence_count: number }>(`
    SELECT
      verification_status::text AS verification_status,
      technology_product_id::int AS technology_product_id,
      (SELECT COUNT(*)::int FROM evidence e WHERE e.deployment_id = d.id) AS evidence_count
    FROM deployment d
    WHERE d.id = $1
    FOR UPDATE
  `, [id])
  const row = rows[0]
  return row
    ? { verificationStatus: row.verification_status, technologyProductId: row.technology_product_id, evidenceCount: row.evidence_count }
    : null
}

export async function insertReview(tx: Queryable, review: {
  deploymentId: number
  adminUserId: number
  decision: string
  note: string | null
}): Promise<number> {
  const rows = await tx.query<{ id: number }>(`
    INSERT INTO verification_review (deployment_id, admin_user_id, decision, review_note)
    VALUES ($1, $2, $3::verification_decision, $4)
    RETURNING id::int AS id
  `, [review.deploymentId, review.adminUserId, review.decision, review.note])
  const row = rows[0]
  if (!row) throw new Error('Inserting the verification review returned no row')
  return row.id
}

export async function setVerificationStatus(tx: Queryable, id: number, status: string): Promise<void> {
  await tx.query('UPDATE deployment SET verification_status = $2::verification_status WHERE id = $1', [id, status])
}

/** Supplier and product names of a technology product, for revision history. */
export async function findTechnologyNames(tx: Queryable, productId: number | null): Promise<{ supplier: string; product: string } | null> {
  if (productId === null) return null
  const rows = await tx.query<{ supplier: string; product: string }>(`
    SELECT c.name AS supplier, p.product_name AS product
    FROM technology_product p JOIN company c ON c.id = p.supplier_id
    WHERE p.id = $1
  `, [productId])
  return rows[0] ?? null
}
