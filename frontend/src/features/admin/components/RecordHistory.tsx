import { formatDateTime, formatEnumLabel } from '../../../lib/format'
import type { ReviewRecord, RevisionHistoryItem } from '../types'

function actor(revision: RevisionHistoryItem): string {
  if (revision.administrator) return `Administrator ${revision.administrator}`
  if (revision.contributorEmail || revision.contributorOrganisation) {
    return `Contributor ${[revision.contributorEmail, revision.contributorOrganisation].filter(Boolean).join(', ')}`
  }
  return 'Anonymous contributor'
}

function describe(value: unknown): string {
  if (value === null || value === undefined) return 'not recorded'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'none'
  return String(value)
}

const ACTIONS: Record<RevisionHistoryItem['action'], string> = {
  create: 'Submitted',
  update: 'Corrected',
  verification_change: 'Verification status changed',
}

function RecordHistory({ record }: { record: ReviewRecord }) {
  return (
    <section className="admin-panel" aria-labelledby="history-heading">
      <h2 id="history-heading">History</h2>

      <h3>Review decisions</h3>
      {record.reviews.length === 0 ? <p className="form-help">No decisions yet.</p> : (
        <ol className="history-list">
          {record.reviews.map((review, index) => (
            <li key={`${review.reviewedAt}-${index}`}>
              <strong>{formatEnumLabel(review.decision)}</strong> by {review.administrator}, {formatDateTime(review.reviewedAt)}
              {review.note && <blockquote>{review.note}</blockquote>}
            </li>
          ))}
        </ol>
      )}

      <h3>Revisions</h3>
      {record.revisions.length === 0 ? <p className="form-help">No revisions recorded.</p> : (
        <ol className="history-list">
          {record.revisions.map((revision, index) => (
            <li key={`${revision.changedAt}-${index}`}>
              <strong>{ACTIONS[revision.action]}</strong> by {actor(revision)}, {formatDateTime(revision.changedAt)}
              {revision.changeNote && <blockquote>{revision.changeNote}</blockquote>}
              {revision.action !== 'create' && revision.previousValues && Object.keys(revision.previousValues).length > 0 && (
                <dl className="previous-values">
                  {Object.entries(revision.previousValues).map(([field, value]) => (
                    <div key={field}><dt>Previous {formatEnumLabel(field).toLowerCase()}</dt><dd>{describe(value)}</dd></div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default RecordHistory
