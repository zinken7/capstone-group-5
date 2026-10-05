import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { addAdministrator, listAdministrators, setAdministratorActive } from '../../../lib/api/admin'
import StateMessage from '../../../shared/components/StateMessage'
import AdminBar from '../components/AdminBar'
import { formatDateTime } from '../format'
import { useAdminSession } from '../session'
import type { AdminAccount, NewAdministrator } from '../types'
import '../admin.css'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; accounts: AdminAccount[] }

/** Root administrators add, deactivate and reactivate administrators. Root accounts are managed from the command line only. */
function AdminUsersPage() {
  const { state } = useAdminSession()
  const isRoot = state.status === 'signed-in' && state.profile.role === 'root'

  return (
    <section className="product-page admin-page">
      <AdminBar />
      <header className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Administrators</h1>
          <p className="intro">Add reviewers and remove their access. Root accounts are managed from the command line.</p>
        </div>
      </header>
      {isRoot
        ? <AccountManager />
        : <StateMessage variant="error" title="Root administrators only" message="Ask a root administrator to add or remove administrators." />}
    </section>
  )
}

function AccountManager() {
  const { handleError } = useAdminSession()
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [email, setEmail] = useState('')
  const [created, setCreated] = useState<NewAdministrator | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    listAdministrators()
      .then((accounts) => setList({ status: 'ready', accounts }))
      .catch((caught: unknown) => setList({ status: 'error', message: handleError(caught) }))
  }, [handleError])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      setCreated(await addAdministrator(email.trim()))
      setCopied(false)
      setEmail('')
      load()
    } catch (caught) {
      setError(handleError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(account: AdminAccount) {
    if (account.active && !window.confirm(`Deactivate ${account.email}? They are signed out at once and cannot sign in until reactivated.`)) return
    setBusy(true)
    setError(null)
    try {
      await setAdministratorActive(account.id, !account.active)
      load()
    } catch (caught) {
      setError(handleError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-record">
      <form className="admin-panel" onSubmit={(event) => void handleAdd(event)} noValidate aria-labelledby="add-heading">
        <h2 id="add-heading">Add an administrator</h2>
        {error && <p className="form-summary-error" role="alert">{error}</p>}
        <div className="form-field">
          <label htmlFor="new-admin-email">Email</label>
          <input id="new-admin-email" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={busy}>Add administrator</button>
        </div>
      </form>

      {created && (
        <section className="admin-panel temporary-password" aria-labelledby="temporary-heading">
          <h2 id="temporary-heading">Temporary password for {created.email}</h2>
          <p><code>{created.temporaryPassword}</code></p>
          <p className="admin-warning">This is the only time it is shown. Send it privately; it must be changed at first sign-in.</p>
          <div className="form-actions">
            {typeof navigator !== 'undefined' && navigator.clipboard && (
              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(created.temporaryPassword).then(() => setCopied(true))
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            <button className="button button--secondary" type="button" onClick={() => setCreated(null)}>Done</button>
          </div>
        </section>
      )}

      {list.status === 'loading' && <StateMessage variant="loading" title="Loading administrators" message="One moment." />}
      {list.status === 'error' && <StateMessage variant="error" title="Administrators unavailable" message={list.message} />}
      {list.status === 'ready' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="visually-hidden">Administrator accounts</caption>
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Added</th>
                <th scope="col"><span className="visually-hidden">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {list.accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.email}</td>
                  <td>{account.role === 'root' ? 'Root' : 'Administrator'}</td>
                  <td>
                    {account.active ? 'Active' : 'Deactivated'}
                    {account.active && account.mustChangePassword && <small>Temporary password not changed yet</small>}
                  </td>
                  <td>{formatDateTime(account.createdAt)}</td>
                  <td>
                    {account.role === 'root'
                      ? <small>Managed from the command line</small>
                      : (
                        <button className="button button--secondary" type="button" disabled={busy} onClick={() => void toggle(account)}
                          aria-label={`${account.active ? 'Deactivate' : 'Reactivate'} ${account.email}`}>
                          {account.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminUsersPage
