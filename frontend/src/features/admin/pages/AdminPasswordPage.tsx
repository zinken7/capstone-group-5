import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { changePassword } from '../../../lib/api/admin'
import AdminBar from '../components/AdminBar'
import { useAdminSession } from '../session'
import '../admin.css'

const MIN_LENGTH = 12

function AdminPasswordPage() {
  const { state, setProfile, handleError } = useAdminSession()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [proposed, setProposed] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const mustChange = state.status === 'signed-in' && state.profile.mustChangePassword

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!current || !proposed) return setError('Enter your current and new passwords.')
    if (proposed.length < MIN_LENGTH) return setError(`The new password needs at least ${MIN_LENGTH} characters.`)
    if (proposed !== confirmation) return setError('The new passwords do not match.')
    if (proposed === current) return setError('The new password must differ from the current one.')

    setSubmitting(true)
    setError(null)
    try {
      setProfile(await changePassword(current, proposed))
      navigate('/admin', { replace: true })
    } catch (caught) {
      setError(handleError(caught))
      setSubmitting(false)
    }
  }

  return (
    <section className="product-page admin-page admin-page--narrow">
      <AdminBar />
      <header className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Change password</h1>
          <p className="intro">
            {mustChange
              ? 'You signed in with a temporary password. Choose a new one to continue.'
              : 'Changing your password signs you out everywhere else.'}
          </p>
        </div>
      </header>

      <form className="admin-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {error && <p className="form-summary-error" role="alert">{error}</p>}
        <div className="form-field">
          <label htmlFor="current-password">{mustChange ? 'Temporary password' : 'Current password'}</label>
          <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" aria-describedby="new-password-help" value={proposed} onChange={(event) => setProposed(event.target.value)} />
          <p className="form-help" id="new-password-help">At least {MIN_LENGTH} characters.</p>
        </div>
        <div className="form-field">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </div>
        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default AdminPasswordPage
