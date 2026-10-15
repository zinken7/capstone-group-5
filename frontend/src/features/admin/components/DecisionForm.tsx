import { useState } from 'react'
import type { FormEvent } from 'react'

import { useAdminSession } from '../session'
import type { ReviewDecision } from '../types'

type DecisionOptions = readonly [ReviewDecision, string, string][]

export const RECORD_DECISIONS: DecisionOptions = [
  ['approved', 'Approve', 'The record is verified and appears in public views.'],
  ['needs_changes', 'Needs changes', 'The record leaves the queue and waits for its contributor to update it.'],
  ['rejected', 'Reject', 'The record is closed and stays out of public views. The contributor can submit it again as a new contribution.'],
]

export const CORRECTION_DECISIONS: DecisionOptions = [
  ['approved', 'Approve', 'The change is applied and appears in public views. The record stays verified.'],
  ['needs_changes', 'Needs changes', 'The record stays as it is. The contributor sees your note and can propose the correction again.'],
  ['rejected', 'Reject', 'The record stays as it is. The contributor sees your note.'],
]

interface DecisionFormProps {
  submit: (decision: ReviewDecision, note: string) => Promise<unknown>
  onDecided: () => void
  heading?: string
  options?: DecisionOptions
  /** Keeps element ids unique when a page shows several forms. */
  idPrefix?: string
  /** Inside another panel (a proposed correction): no panel of its own, and a smaller heading */
  embedded?: boolean
  /** The contributor reads a decision on their own submission, note included (FR-45) */
  noteShownToContributor?: boolean
  /** What the record lacks before it can be approved; Approve is unavailable until it is supplied */
  approvalBlockers?: readonly ApprovalBlocker[]
}

/** Something approval needs that a submission may lack, since it is optional when submitting (FR-07, FR-44) */
export interface ApprovalBlocker {
  /** What is missing, as a short phrase */
  label: string
  /** What to ask the contributor for */
  request: string
}

/** A note that asks the contributor for everything that is missing */
function requestFor(blockers: readonly ApprovalBlocker[]): string {
  const asks = blockers.map((blocker) => blocker.request)
  const list = asks.length > 1 ? `${asks.slice(0, -1).join(', ')} and ${asks.at(-1)}` : asks[0]
  return `Before this can be approved, please add ${list}.`
}

function DecisionForm({ submit, onDecided, heading = 'Decision', options = RECORD_DECISIONS, idPrefix = 'decision', embedded = false, noteShownToContributor = false, approvalBlockers = [] }: DecisionFormProps) {
  const { handleError } = useAdminSession()
  const blocked = approvalBlockers.length > 0
  // A record that cannot be approved yet starts on asking for what it lacks
  const [decision, setDecision] = useState<ReviewDecision>(blocked ? 'needs_changes' : 'approved')
  const [note, setNote] = useState(blocked ? requestFor(approvalBlockers) : '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const noteRequired = decision !== 'approved'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (noteRequired && !note.trim()) {
      setError('Add a note explaining the decision.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submit(decision, note)
      setNote('')
      onDecided()
    } catch (caught) {
      setError(handleError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={embedded ? 'decision-form decision-form--embedded' : 'admin-panel decision-form'} onSubmit={(event) => void handleSubmit(event)} noValidate aria-labelledby={`${idPrefix}-heading`}>
      {embedded ? <h3 id={`${idPrefix}-heading`}>{heading}</h3> : <h2 id={`${idPrefix}-heading`}>{heading}</h2>}
      {error && <p className="form-summary-error" role="alert">{error}</p>}
      {blocked && (
        <div className="decision-blockers" id={`${idPrefix}-blockers`}>
          <p><strong>Not ready to approve</strong></p>
          <ul>{approvalBlockers.map((blocker) => <li key={blocker.label}>{blocker.label}</li>)}</ul>
          <p>Add {approvalBlockers.length > 1 ? 'them' : 'it'} yourself with <strong>Edit record</strong>, or ask the contributor with <strong>Needs changes</strong>.</p>
        </div>
      )}
      <fieldset className="decision-options">
        <legend className="visually-hidden">{heading}</legend>
        {options.map(([value, label, help]) => (
          <label key={value} className="decision-option">
            <input
              type="radio"
              name={idPrefix}
              value={value}
              checked={decision === value}
              onChange={() => setDecision(value)}
              disabled={value === 'approved' && blocked}
              aria-describedby={value === 'approved' && blocked ? `${idPrefix}-blockers` : undefined}
            />
            <span><strong>{label}</strong><small>{help}</small></span>
          </label>
        ))}
      </fieldset>
      <div className="form-field">
        <label htmlFor={`${idPrefix}-note`}>Note <span className="form-help-inline">{noteRequired ? '(required)' : '(optional)'}</span></label>
        <textarea id={`${idPrefix}-note`} rows={blocked ? 5 : 3} maxLength={2000} value={note} aria-required={noteRequired} aria-describedby={noteShownToContributor ? `${idPrefix}-note-help` : undefined} onChange={(event) => setNote(event.target.value)} />
        {noteShownToContributor && <small id={`${idPrefix}-note-help`} className="form-help">Shown to the contributor.</small>}
      </div>
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Record decision'}
        </button>
      </div>
    </form>
  )
}

export default DecisionForm
