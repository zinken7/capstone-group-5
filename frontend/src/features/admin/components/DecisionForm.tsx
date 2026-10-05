import { useState } from 'react'
import type { FormEvent } from 'react'

import { useAdminSession } from '../session'
import type { ReviewDecision } from '../types'

type DecisionOptions = readonly [ReviewDecision, string, string][]

export const RECORD_DECISIONS: DecisionOptions = [
  ['approved', 'Approve', 'The record is verified and appears in public views.'],
  ['needs_changes', 'Needs changes', 'The record leaves the queue until a correction is submitted.'],
  ['rejected', 'Reject', 'The record stays out of public views.'],
]

export const CORRECTION_DECISIONS: DecisionOptions = [
  ['approved', 'Approve', 'The change is applied and appears in public views. The record stays verified.'],
  ['needs_changes', 'Needs changes', 'The record stays as it is. The contributor can send a new correction.'],
  ['rejected', 'Reject', 'The record stays as it is.'],
]

interface DecisionFormProps {
  submit: (decision: ReviewDecision, note: string) => Promise<unknown>
  onDecided: () => void
  heading?: string
  options?: DecisionOptions
  /** Keeps element ids unique when a page shows several forms. */
  idPrefix?: string
}

function DecisionForm({ submit, onDecided, heading = 'Decision', options = RECORD_DECISIONS, idPrefix = 'decision' }: DecisionFormProps) {
  const { handleError } = useAdminSession()
  const [decision, setDecision] = useState<ReviewDecision>('approved')
  const [note, setNote] = useState('')
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
    <form className="admin-panel decision-panel" onSubmit={(event) => void handleSubmit(event)} noValidate aria-labelledby={`${idPrefix}-heading`}>
      <h2 id={`${idPrefix}-heading`}>{heading}</h2>
      {error && <p className="form-summary-error" role="alert">{error}</p>}
      <fieldset className="decision-options">
        <legend className="visually-hidden">{heading}</legend>
        {options.map(([value, label, help]) => (
          <label key={value} className="decision-option">
            <input type="radio" name={idPrefix} value={value} checked={decision === value} onChange={() => setDecision(value)} />
            <span><strong>{label}</strong><small>{help}</small></span>
          </label>
        ))}
      </fieldset>
      <div className="form-field">
        <label htmlFor={`${idPrefix}-note`}>Note{noteRequired ? ' (required)' : ' (optional)'}</label>
        <textarea id={`${idPrefix}-note`} rows={3} maxLength={2000} value={note} aria-required={noteRequired} onChange={(event) => setNote(event.target.value)} />
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
