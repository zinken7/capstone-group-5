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
  const [showPasswords, setShowPasswords] = useState(false)

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

  // The same rules handleSubmit enforces, shown as the password is typed
  const checks = [
    { label: `At least ${MIN_LENGTH} characters`, met: proposed.length >= MIN_LENGTH },
    { label: 'Different from the current password', met: proposed.length > 0 && proposed !== current },
    { label: 'Both new passwords match', met: confirmation.length > 0 && proposed === confirmation },
  ]
  const inputType = showPasswords ? 'text' : 'password'

  return (
    <>
      <AdminBar />
      <main className="admin-page admin-page--form" id="main-content" tabIndex={-1}>
        <header className="admin-heading">
          <div>
            <h1>Change password</h1>
          </div>
        </header>

        {mustChange && (
          <p className="admin-notice admin-notice--warning" role="status">
            You signed in with a temporary password. Choose a new one to continue; the other administration pages open once it is changed.
          </p>
        )}

        <form className="admin-panel admin-password" onSubmit={(event) => void handleSubmit(event)} noValidate>
          {error && <p className="form-summary-error" role="alert">{error}</p>}
          <div className="form-field">
            <label htmlFor="current-password">{mustChange ? 'Temporary password' : 'Current password'}</label>
            <input id="current-password" type={inputType} autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type={inputType} autoComplete="new-password" aria-describedby="new-password-checks" value={proposed} onChange={(event) => setProposed(event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type={inputType} autoComplete="new-password" aria-describedby="new-password-checks" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </div>
          <label className="admin-check">
            <input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} />
            Show passwords
          </label>
          <ul className="password-checks" id="new-password-checks" aria-label="Password requirements">
            {checks.map((check) => (
              <li key={check.label} className={check.met ? 'password-checks__met' : undefined}>
                <span aria-hidden="true">{check.met ? '✓' : '○'}</span>
                {check.label}
                <span className="visually-hidden">{check.met ? ' (done)' : ' (not yet)'}</span>
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </main>
    </>
  )
}

export default AdminPasswordPage
