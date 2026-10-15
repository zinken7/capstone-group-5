import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getReviewQueue } from '../../../lib/api/admin'
import StateMessage from '../../../shared/components/StateMessage'
import AdminBar from '../components/AdminBar'
import { formatCountry, formatDateTime, formatEnumLabel, formatNumber } from '../../../lib/format'
import { useAdminSession } from '../session'
import { formatWaiting } from '../waiting'
import type { ReviewQueueItem } from '../types'
import '../admin.css'

type QueueState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: ReviewQueueItem[] }

function AdminQueuePage() {
  const { handleError } = useAdminSession()
  const [queue, setQueue] = useState<QueueState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    getReviewQueue()
      .then((items) => active && setQueue({ status: 'ready', items }))
      .catch((error: unknown) => active && setQueue({ status: 'error', message: handleError(error) }))
    return () => {
      active = false
    }
  }, [handleError])

  const count = queue.status === 'ready' ? queue.items.length : null

  return (
    <>
      <AdminBar />
      <main className="admin-page" id="main-content" tabIndex={-1}>
        <header className="admin-heading">
          <div>
            <h1>Review queue</h1>
          </div>
          {count !== null && count > 0 && <p className="admin-count"><strong>{formatNumber(count)}</strong> waiting</p>}
        </header>

        {queue.status === 'loading' && <StateMessage variant="loading" title="Loading the queue" message="Fetching records pending review." />}
        {queue.status === 'error' && <StateMessage variant="error" title="Queue unavailable" message={queue.message} />}
        {queue.status === 'ready' && queue.items.length === 0 && (
          <StateMessage title="Nothing to review" message="There are no submissions waiting for a decision." />
        )}
        {queue.status === 'ready' && queue.items.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--stack">
              <caption className="visually-hidden">Records pending review</caption>
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Technology</th>
                  <th scope="col">Sources</th>
                  <th scope="col">Waiting</th>
                  <th scope="col"><span className="visually-hidden">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {queue.items.map((item) => (
                  <tr key={`${item.kind}-${item.correctionId ?? item.id}`}>
                    <td className="admin-queue__record">
                      <strong>{item.siteName}</strong>
                      <small>{[item.region, formatCountry(item.countryCode)].filter(Boolean).join(', ')}</small>
                      <span className="admin-queue__machine">
                        <span>{[item.machineManufacturer, item.machineModel].filter(Boolean).join(' ')}</span>
                        <small>{formatEnumLabel(item.machineType)} · {formatNumber(item.quantity)} {item.quantity === 1 ? 'machine' : 'machines'}</small>
                      </span>
                    </td>
                    <td data-label="Kind">
                      {/* An update that answers a request for changes is told apart from any other returned record */}
                      {item.afterChangesRequested
                        ? <span className="admin-kind admin-kind--changes">Changes made</span>
                        : item.updatedWhilePending
                          ? <span className="admin-kind admin-kind--changes">Updated while waiting</span>
                        : item.resubmissionOf !== null
                          ? <span className="admin-kind admin-kind--resubmission">Resubmission</span>
                          : <span className={`admin-kind admin-kind--${item.kind}`}>{formatEnumLabel(item.kind)}</span>}
                      {item.resubmissionOf !== null && <small>Replaces rejected record {item.resubmissionOf}</small>}
                      {item.changedFields.length > 0 && <small>{item.changedFields.map(formatEnumLabel).join(', ')}</small>}
                      {(item.contributorEmail || item.contributorOrganisation) && <small>{[item.contributorEmail, item.contributorOrganisation].filter(Boolean).join(' · ')}</small>}
                    </td>
                    <td data-label="Technology">{item.technologyProduct ? `${item.technologySupplier ?? ''} ${item.technologyProduct}`.trim() : <span className="admin-warning">Not recorded</span>}</td>
                    <td data-label="Sources">{item.evidenceCount > 0 ? formatNumber(item.evidenceCount) : <span className="admin-warning">None</span>}</td>
                    <td data-label="Waiting"><time dateTime={item.submittedAt} title={formatDateTime(item.submittedAt)}>{formatWaiting(item.submittedAt)}</time></td>
                    <td className="admin-queue__action">
                      <Link
                        className="admin-review-link"
                        to={`/admin/deployments/${item.id}`}
                        aria-label={item.kind === 'correction' && item.correctionId !== null ? `Review correction ${item.correctionId} to ${item.siteName} record ${item.id}` : `Review ${item.siteName} record ${item.id}`}
                      >
                        Review
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}

export default AdminQueuePage
