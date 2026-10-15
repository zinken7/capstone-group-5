import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getSubmissionHistory } from '../../../lib/api/admin'
import { formatCountry, formatDateTime, formatEnumLabel } from '../../../lib/format'
import StateMessage from '../../../shared/components/StateMessage'
import StatusBadge from '../../../shared/components/StatusBadge'
import AdminBar from '../components/AdminBar'
import type { SubmissionHistoryItem, SubmissionHistorySort } from '../types'
import '../admin.css'

const PAGE_SIZE = 50
/** Typing pauses this long before the search runs, so each keystroke does not send a request */
const SEARCH_DELAY_MS = 250

type SortOrder = 'asc' | 'desc'

/** The status colour each decision leads to */
const DECISION_STATUS: Record<string, string> = {
  approved: 'verified',
  rejected: 'rejected',
  needs_changes: 'changes_requested',
}

/** Verification statuses to filter by; Changes requested lists the records waiting on their contributor */
const STATUS_CHOICES = ['pending_review', 'changes_requested', 'verified', 'rejected', 'unverified'] as const

/** The sort choices offered on small screens, where the table's headings are hidden */
const SORT_CHOICES: { value: `${SubmissionHistorySort}:${SortOrder}`; label: string }[] = [
  { value: 'updated:desc', label: 'Last updated, newest first' },
  { value: 'updated:asc', label: 'Last updated, oldest first' },
  { value: 'id:desc', label: 'Submission ID, highest first' },
  { value: 'id:asc', label: 'Submission ID, lowest first' },
  { value: 'site:asc', label: 'Site, A to Z' },
  { value: 'site:desc', label: 'Site, Z to A' },
  { value: 'decision:asc', label: 'Latest decision, A to Z' },
  { value: 'decision:desc', label: 'Latest decision, Z to A' },
  { value: 'status:asc', label: 'Current status, A to Z' },
  { value: 'status:desc', label: 'Current status, Z to A' },
]

/** IDs and dates start newest first; text columns start A to Z */
function defaultOrder(sort: SubmissionHistorySort): SortOrder {
  return sort === 'id' || sort === 'updated' ? 'desc' : 'asc'
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: SubmissionHistoryItem[]; hasNextPage: boolean }

const DAY_MS = 24 * 60 * 60 * 1000

/** How long a record has waited on its contributor since changes were requested, for closing ones that get no reply */
function waitingLabel(since: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(since).getTime()) / DAY_MS)
  if (!(days >= 1)) return 'waiting since today'
  return `waiting ${days} ${days === 1 ? 'day' : 'days'}`
}

function decisionLabel(decision: string, isCorrection: boolean | null): string {
  const label = formatEnumLabel(decision)
  return isCorrection ? `Correction ${label.toLowerCase()}` : label
}

function AdminSubmissionHistoryPage() {
  const [page, setPage] = useState<PageState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<{ key: SubmissionHistorySort; order: SortOrder }>({ key: 'updated', order: 'desc' })

  // Searches as you type, like the register, once typing pauses
  useEffect(() => {
    const value = search.trim()
    if (value === query) return
    const timer = window.setTimeout(() => runSearch(value), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [search, query])

  useEffect(() => {
    let active = true

    getSubmissionHistory({ limit: PAGE_SIZE + 1, offset, q: query || undefined, sort: sort.key, order: sort.order, status: status || undefined })
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
  }, [query, offset, sort, status])

  function runSearch(value: string) {
    setQuery(value)
    setOffset(0)
  }

  function changeSort(key: SubmissionHistorySort) {
    setSort((current) => current.key === key
      ? { key, order: current.order === 'asc' ? 'desc' : 'asc' }
      : { key, order: defaultOrder(key) })
    setOffset(0)
  }

  function sortableHeader(label: string, key: SubmissionHistorySort) {
    const direction = sort.order === 'asc' ? 'ascending' : 'descending'
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? direction : 'none'}>
        <button className="table-sort-button" type="button" onClick={() => changeSort(key)} aria-label={active ? `Sort by ${label}, ${direction}` : `Sort by ${label}`}>
          {label} <span aria-hidden="true">{active ? (sort.order === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
      </th>
    )
  }

  return (
    <>
      <AdminBar />
      <main className="admin-page" id="main-content" tabIndex={-1}>
        <header className="admin-heading">
          <div>
            <h1>Submission history</h1>
          </div>
        </header>

        <div className="admin-filters">
          {/* Enter searches at once instead of waiting for the pause; the field's own clear button empties it, as on the register */}
          <form role="search" className="admin-search" onSubmit={(event) => { event.preventDefault(); runSearch(search.trim()) }}>
            <label htmlFor="submission-search">Search</label>
            <input
              id="submission-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Submission ID or site name"
            />
          </form>
          <div className="admin-filter">
            <label htmlFor="history-status">Status</label>
            <select id="history-status" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0) }}>
              <option value="">All statuses</option>
              {STATUS_CHOICES.map((value) => <option key={value} value={value}>{formatEnumLabel(value)}</option>)}
            </select>
          </div>
        </div>

        {page.status === 'loading' && (
          <StateMessage variant="loading" title="Loading submission history" message="Fetching historical submissions." />
        )}
        {page.status === 'error' && (
          <StateMessage variant="error" title="History unavailable" message={page.message} />
        )}
        {page.status === 'ready' && page.items.length === 0 && (
          <StateMessage title="No submissions found" message={status ? 'Try another status, ID or site name, or clear the filters.' : 'Try another ID or site name, or clear the search.'} />
        )}
        {page.status === 'ready' && page.items.length > 0 && (
          <>
            <div className="admin-sort">
              <label htmlFor="history-sort">Sort by</label>
              <select
                id="history-sort"
                value={`${sort.key}:${sort.order}`}
                onChange={(event) => {
                  const [key, order] = event.target.value.split(':') as [SubmissionHistorySort, SortOrder]
                  setSort({ key, order })
                  setOffset(0)
                }}
              >
                {SORT_CHOICES.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--stack">
                <caption className="visually-hidden">Submission history</caption>
                <thead>
                  <tr>
                    {sortableHeader('Submission ID', 'id')}
                    {sortableHeader('Site', 'site')}
                    <th scope="col">Country</th>
                    {sortableHeader('Latest decision', 'decision')}
                    {sortableHeader('Current status', 'status')}
                    {sortableHeader('Last updated', 'updated')}
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Submission ID">{item.id}</td>
                      <td data-label="Site">{item.siteName}</td>
                      <td data-label="Country">{formatCountry(item.countryCode)}</td>
                      <td data-label="Latest decision">
                        {item.latestDecision
                          ? <StatusBadge status={DECISION_STATUS[item.latestDecision]} label={decisionLabel(item.latestDecision, item.latestDecisionIsCorrection)} />
                          : 'No review recorded'}
                      </td>
                      <td data-label="Current status"><StatusBadge status={item.verificationStatus} /></td>
                      <td data-label="Last updated">
                        {formatDateTime(item.updatedAt)}
                        {item.verificationStatus === 'changes_requested' && <small className="admin-waiting-age">{waitingLabel(item.updatedAt)}</small>}
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

            <div className="admin-pagination">
              <button className="button button--secondary"
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </button>
              <span>Showing {offset + 1}–{offset + page.items.length}</span>
              <button className="button button--secondary"
                type="button"
                disabled={!page.hasNextPage}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </>
  )
}

export default AdminSubmissionHistoryPage