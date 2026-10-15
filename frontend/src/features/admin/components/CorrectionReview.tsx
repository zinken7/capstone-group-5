import { submitCorrectionDecision } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/errors'
import { formatDateTime, formatEnumLabel } from '../../../lib/format'
import { contributorOf, describeValue } from '../corrections'
import type { CorrectionChange, CorrectionItem } from '../types'
import DecisionForm, { CORRECTION_DECISIONS } from './DecisionForm'

function changedSince(change: CorrectionChange): boolean {
  return JSON.stringify(change.current) !== JSON.stringify(change.before)
}

interface CorrectionReviewProps {
  correction: CorrectionItem
  /** The record's updated_at as the page shows it; a decision on an older version is refused */
  version: string
  onDecided: () => void
  /** The record changed while the page was open: show the latest version instead */
  onStale: () => void
}

/**
 * A correction a contributor proposed for a verified record. The record stays
 * public as it is until the correction is decided here.
 */
function CorrectionReview({ correction, version, onDecided, onStale }: CorrectionReviewProps) {
  const prefix = `correction-${correction.id}`

  return (
    <section className="admin-panel correction-panel admin-record__lead" aria-labelledby={`${prefix}-title`}>
      <header className="correction-panel__header">
        <h2 id={`${prefix}-title`}>Proposed correction</h2>
        <p className="form-help">{contributorOf(correction)} · {formatDateTime(correction.submittedAt)}. The public record is unchanged until you decide.</p>
      </header>
      {correction.changes.length > 0 && (
        <div className="admin-table-wrap admin-table-wrap--flat">
          <table className="admin-table correction-changes">
            <caption className="visually-hidden">Proposed changes</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Before</th>
                <th scope="col">Proposed</th>
              </tr>
            </thead>
            <tbody>
              {correction.changes.map((change) => (
                <tr key={change.field}>
                  <th scope="row">{formatEnumLabel(change.field)}</th>
                  <td>
                    {describeValue(change.before)}
                    {changedSince(change) && <small className="admin-warning">Now {describeValue(change.current)}: the record changed after this was submitted</small>}
                  </td>
                  <td><strong className="correction-panel__proposed">{describeValue(change.proposed)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {correction.changeNote && <blockquote>{correction.changeNote}</blockquote>}
      <div className="correction-panel__sources">
        <h3>Sources supplied</h3>
        {correction.evidenceUrls.length === 0 ? (
          <p className="admin-warning">No source supplied with this correction.</p>
        ) : (
          <ul className="evidence-links">
            {correction.evidenceUrls.map((url) => (
              <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>
            ))}
          </ul>
        )}
      </div>
      <DecisionForm
        embedded
        idPrefix={prefix}
        heading="Decision on this correction"
        options={CORRECTION_DECISIONS}
        submit={async (decision, note) => {
          try {
            await submitCorrectionDecision(correction.id, decision, note, version)
          } catch (cause) {
            // Another correction or an edit changed the record since the page was opened, so its current values here are old
            if (cause instanceof ApiError && cause.status === 409 && cause.message === 'the record changed since you opened it') {
              onStale()
              throw new Error('This record changed while you had it open.', { cause })
            }
            throw cause
          }
        }}
        onDecided={onDecided}
        noteShownToContributor
      />
    </section>
  )
}

export default CorrectionReview
