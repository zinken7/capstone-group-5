import type { Pool } from 'pg'

import type { FetchedSource } from './sources.js'
import type { ClaimField, FieldVerdict, Recommendation, SpamGateResult } from './types.js'
import type { Verdict, VerifierPath } from './verifier/types.js'

/**
 * Stage 6 — store (design §6 stage 6). Append-only, one transaction,
 * behind an interface so the pipeline runs without a database (the module
 * is standalone; migration 003 is parked). Two implementations: in-memory
 * for the CLI, the evaluation and the tests, and Postgres targeting
 * sql/003_verification.sql once that migration is sequenced.
 */

export interface StoredClaim {
  field: ClaimField
  subject: string
  subFact: string
  required: boolean
  hypothesis: string
  verdict: Verdict
  /** Absolute character offsets into the stored source's extractedText (migration 003). */
  quoteStart: number | null
  quoteEnd: number | null
  score: number | null
  /** Null when retrieval found no candidates and stage 4 never ran. */
  path: VerifierPath | null
  note: string | null
}

export interface VerificationReport {
  spamGateResult: SpamGateResult
  recommendation: Recommendation
  recommendationBasis: string
  fieldVerdicts: Partial<Record<ClaimField, FieldVerdict>>
  /** Reproducibility tuple (design §8); null when the gate rejected before any model ran. */
  modelName: string | null
  promptVersion: string | null
  generatedAt: Date
  /** The one MVP evidence source; null only when gate rule 1 failed before any fetch. */
  source: FetchedSource | null
  claims: StoredClaim[]
}

export interface ReportRef {
  deploymentId: number
  revisionId: number
}

export interface ReportStore {
  /** Inserts the whole report atomically; append-only, never updates. */
  save(report: VerificationReport, ref?: ReportRef): Promise<{ reportId: number }>
}

/**
 * The cross-row half of migration 003's span constraints, checked before
 * any insert (and by the in-memory store, so tests enforce the same
 * invariant): a cited span must land inside the stored source text — R1's
 * last line of defence before a quote reaches a reviewer.
 */
export function assertStorable(report: VerificationReport): void {
  const text = report.source?.extractedText ?? null
  for (const claim of report.claims) {
    const where = `${claim.field}.${claim.subFact}${claim.subject === '' ? '' : ` (${claim.subject})`}`
    if ((claim.quoteStart === null) !== (claim.quoteEnd === null)) {
      throw new Error(`${where}: quote offsets must be paired`)
    }
    if (claim.verdict !== 'insufficient' && (claim.quoteStart === null || text === null)) {
      throw new Error(`${where}: a ${claim.verdict} verdict must cite a span of the stored source`)
    }
    if (claim.quoteStart !== null && claim.quoteEnd !== null) {
      if (text === null || claim.quoteStart < 0 || claim.quoteEnd <= claim.quoteStart || claim.quoteEnd > text.length) {
        throw new Error(`${where}: quote [${claim.quoteStart}, ${claim.quoteEnd}) is not inside the stored source text`)
      }
    }
  }
}

export class InMemoryReportStore implements ReportStore {
  readonly saved: Array<{ reportId: number; report: VerificationReport; ref: ReportRef | null }> = []

  save(report: VerificationReport, ref?: ReportRef): Promise<{ reportId: number }> {
    assertStorable(report)
    const reportId = this.saved.length + 1
    this.saved.push({ reportId, report, ref: ref ?? null })
    return Promise.resolve({ reportId })
  }
}

/**
 * Targets sql/003_verification.sql. Untested until that migration is
 * sequenced into backend/migrations/ and a database with the ERD's
 * contribution tables exists (team decision); the insert order and column
 * lists mirror the file exactly.
 */
export class PostgresReportStore implements ReportStore {
  constructor(private readonly pool: Pool) {}

  async save(report: VerificationReport, ref?: ReportRef): Promise<{ reportId: number }> {
    if (ref === undefined) {
      throw new Error('PostgresReportStore requires deployment and revision ids')
    }
    assertStorable(report)

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO verification_report
           (deployment_id, revision_id, spam_gate_result, recommendation, recommendation_basis,
            field_verdicts, model_name, prompt_version, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          ref.deploymentId,
          ref.revisionId,
          report.spamGateResult,
          report.recommendation,
          report.recommendationBasis,
          JSON.stringify(report.fieldVerdicts),
          report.modelName,
          report.promptVersion,
          report.generatedAt,
        ],
      )
      const reportId = Number(inserted.rows[0]?.id)

      let sourceId: number | null = null
      if (report.source !== null) {
        const source = await client.query<{ id: string }>(
          `INSERT INTO fetched_source
             (report_id, url, archived_url, http_status, published_date, source_class,
              extracted_text, text_sha256, fetched_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            reportId,
            report.source.url,
            report.source.archivedUrl,
            report.source.httpStatus,
            report.source.publishedDate,
            report.source.sourceClass,
            report.source.extractedText,
            report.source.textSha256,
            report.source.fetchedAt,
          ],
        )
        sourceId = Number(source.rows[0]?.id)
      }

      for (const claim of report.claims) {
        await client.query(
          `INSERT INTO verification_claim
             (report_id, field, subject, sub_fact, required, hypothesis, verdict,
              source_id, quote_start, quote_end, score, path, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            reportId,
            claim.field,
            claim.subject,
            claim.subFact,
            claim.required,
            claim.hypothesis,
            claim.verdict,
            claim.quoteStart === null ? null : sourceId,
            claim.quoteStart,
            claim.quoteEnd,
            claim.score,
            claim.path,
            claim.note,
          ],
        )
      }

      await client.query('COMMIT')
      return { reportId }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
