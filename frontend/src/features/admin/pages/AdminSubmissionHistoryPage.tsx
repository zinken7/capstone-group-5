import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getSubmissionHistory } from '../../../lib/api/admin'
import StateMessage from '../../../shared/components/StateMessage'
import AdminBar from '../components/AdminBar'
import type { SubmissionHistoryItem } from '../types'
import '../admin.css'

const PAGE_SIZE = 50

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: SubmissionHistoryItem[]; hasNextPage: boolean }

function decisionLabel(decision: string | null, verificationStatus: string): string {
  if (decision === 'needs_changes') return 'Needs Changes'
  if (decision === 'approved') return 'Approved'
  if (decision === 'rejected') return 'Rejected'
  if (verificationStatus === 'pending_review') return 'Pending Review'
  return verificationStatus.replaceAll('_', ' ')
}

function AdminSubmissionHistoryPage() {
  const [page, setPage] = useState<PageState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<number | undefined>()
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let active = true


    getSubmissionHistory(PAGE_SIZE + 1, offset, activeId)
      .then((items) => {
        if (active) {
          setPage({
            status: 'ready',
            items: items.slice(0, PAGE_SIZE),
            hasNextPage: items.length > PAGE_SIZE,
          })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPage({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load submission history.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [activeId, offset])

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = search.trim()

    if (value && (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value)))) {
      setPage({ status: 'error', message: 'Enter a valid positive Submission ID.' })
      return
    }

    setOffset(0)
    setActiveId(value ? Number(value) : undefined)
  }

  return (
    <>
      <AdminBar />
      <main className="admin-page" id="main-content" tabIndex={-1}>
        <header className="admin-heading">
          <div>
            <h1>Submission history</h1>
            <p>Find submissions across verification statuses and review their latest decisions.</p>
          </div>
        </header>

        <form onSubmit={handleSearch} className="admin-search">
          <label htmlFor="submission-id">Submission ID</label>
          <input
            id="submission-id"
            type="search"
            inputMode="numeric"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Enter a Submission ID"
          />
          <button type="submit">Search</button>
          <button type="button" onClick={() => {
            setSearch('')
            setOffset(0)
            setActiveId(undefined)
          }}>
            Show all
          </button>
        </form>

        {page.status === 'loading' && (
          <StateMessage variant="loading" title="Loading submission history" message="Fetching historical submissions." />
        )}
        {page.status === 'error' && (
          <StateMessage variant="error" title="History unavailable" message={page.message} />
        )}
        {page.status === 'ready' && page.items.length === 0 && (
          <StateMessage title="No submissions found" message="Try another Submission ID or show all submissions." />
        )}
        {page.status === 'ready' && page.items.length > 0 && (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--stack">
                <caption className="visually-hidden">Submission history</caption>
                <thead>
                  <tr>
                    <th scope="col">Submission ID</th>
                    <th scope="col">Site</th>
                    <th scope="col">Country</th>
                    <th scope="col">Latest decision</th>
                    <th scope="col">Current status</th>
                    <th scope="col">Last updated</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Submission ID">{item.id}</td>
                      <td data-label="Site">{item.siteName}</td>
                      <td data-label="Country">{item.countryCode || '—'}</td>
                      <td data-label="Latest decision">
                        {item.latestDecision
                          ? decisionLabel(item.latestDecision, item.verificationStatus)
                          : 'No review recorded'}
                      </td>
                      <td data-label="Current status">{item.verificationStatus.replaceAll('_', ' ')}</td>
                      <td data-label="Last updated">
                        {Number.isNaN(Date.parse(item.updatedAt))
                          ? item.updatedAt
                          : new Date(item.updatedAt).toLocaleString()}
                      </td>
                      <td data-label="Action">
                        <Link className="admin-review-link" to={`/admin/deployments/${item.id}`}>
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!activeId && (
              <div className="admin-pagination">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </button>
                <span>Showing {offset + 1}–{offset + page.items.length}</span>
                <button
                  type="button"
                  disabled={!page.hasNextPage}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

export default AdminSubmissionHistoryPage