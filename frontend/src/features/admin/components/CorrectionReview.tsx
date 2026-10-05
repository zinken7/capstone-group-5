import { submitCorrectionDecision } from '../../../lib/api/admin'
import { contributorOf, describeValue, formatDateTime, humanise } from '../format'
import type { CorrectionChange, CorrectionItem } from '../types'
import DecisionForm, { CORRECTION_DECISIONS } from './DecisionForm'

function changedSince(change: CorrectionChange): boolean {
  return JSON.stringify(change.current) !== JSON.stringify(change.before)
}

interface CorrectionReviewProps {
  correction: CorrectionItem
  onDecided: () => void
}

/**
 * A correction a contributor proposed for a verified record. The record stays
 * public as it is until the correction is decided here.
 */
function CorrectionReview({ correction, onDecided }: CorrectionReviewProps) {
  const prefix = `correction-${correction.id}`

  return (
    <>
      <section className="admin-panel correction-panel" aria-labelledby={`${prefix}-title`}>
        <h2 id={`${prefix}-title`}>Proposed correction</h2>
        <p className="form-help">{contributorOf(correction)}, {formatDateTime(correction.submittedAt)}. The public record is unchanged until you decide.</p>
        {correction.changes.length > 0 && (
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
                  <th scope="row">{humanise(change.field)}</th>
                  <td>
                    {describeValue(change.before)}
                    {changedSince(change) && <small className="admin-warning">Now {describeValue(change.current)}: the record changed after this was submitted</small>}
                  </td>
                  <td><strong>{describeValue(change.proposed)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {correction.changeNote && <blockquote>{correction.changeNote}</blockquote>}
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
      </section>
      <DecisionForm
        idPrefix={prefix}
        heading="Decision on this correction"
        options={CORRECTION_DECISIONS}
        submit={(decision, note) => submitCorrectionDecision(correction.id, decision, note)}
        onDecided={onDecided}
      />
    </>
  )
}

export default CorrectionReview
