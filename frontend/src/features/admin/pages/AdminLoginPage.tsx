import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { signIn } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/errors'
import { useAdminSession } from '../session'
import '../admin.css'

function AdminLoginPage() {
  const { state, setProfile } = useAdminSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (state.status === 'signed-in') {
    return <Navigate replace to={state.profile.mustChangePassword ? '/admin/password' : from} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const profile = await signIn(email.trim(), password)
      setProfile(profile)
      navigate(profile.mustChangePassword ? '/admin/password' : from, { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 401
        ? 'Incorrect email or password.'
        : caught instanceof Error ? caught.message : 'Sign-in failed.')
      setSubmitting(false)
    }
  }

  return (
    <section className="product-page admin-page admin-page--narrow">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Sign in</h1>
          <p className="intro">Administrators review community submissions before they appear in public views.</p>
        </div>
      </header>

      <form className="admin-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {error && <p className="form-summary-error" role="alert">{error}</p>}
        <div className="form-field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default AdminLoginPage
