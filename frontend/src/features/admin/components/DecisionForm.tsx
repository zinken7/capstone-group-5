import { useState } from 'react'
import type { FormEvent } from 'react'

import { submitDecision } from '../../../lib/api/admin'
import { useAdminSession } from '../session'
import type { ReviewDecision } from '../types'

const DECISIONS: readonly [ReviewDecision, string, string][] = [
  ['approved', 'Approve', 'The record is verified and appears in public views.'],
  ['needs_changes', 'Needs changes', 'The record leaves the queue until a correction is submitted.'],
  ['rejected', 'Reject', 'The record stays out of public views.'],
]

interface DecisionFormProps {
  recordId: number
  onDecided: () => void
}

function DecisionForm({ recordId, onDecided }: DecisionFormProps) {
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
      await submitDecision(recordId, decision, note)
      setNote('')
      onDecided()
    } catch (caught) {
      setError(handleError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-panel" onSubmit={(event) => void handleSubmit(event)} noValidate aria-labelledby="decision-heading">
      <h2 id="decision-heading">Decision</h2>
      {error && <p className="form-summary-error" role="alert">{error}</p>}
      <fieldset className="decision-options">
        <legend className="visually-hidden">Decision</legend>
        {DECISIONS.map(([value, label, help]) => (
          <label key={value} className="decision-option">
            <input type="radio" name="decision" value={value} checked={decision === value} onChange={() => setDecision(value)} />
            <span><strong>{label}</strong><small>{help}</small></span>
          </label>
        ))}
      </fieldset>
      <div className="form-field">
        <label htmlFor="decision-note">Note{noteRequired ? ' (required)' : ' (optional)'}</label>
        <textarea id="decision-note" rows={3} maxLength={2000} value={note} aria-required={noteRequired} onChange={(event) => setNote(event.target.value)} />
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
