import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getReviewQueue } from '../../../lib/api/admin'
import StateMessage from '../../../shared/components/StateMessage'
import AdminBar from '../components/AdminBar'
import { formatDateTime, formatEnumLabel, formatNumber } from '../../../lib/format'
import { useAdminSession } from '../session'
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

  return (
    <section className="product-page admin-page">
      <AdminBar />
      <header className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Review queue</h1>
          <p className="intro">Submissions and corrections waiting for a decision, oldest first. Nothing here is public until it is approved.</p>
        </div>
      </header>

      {queue.status === 'loading' && <StateMessage variant="loading" title="Loading the queue" message="Fetching records pending review." />}
      {queue.status === 'error' && <StateMessage variant="error" title="Queue unavailable" message={queue.message} />}
      {queue.status === 'ready' && queue.items.length === 0 && (
        <StateMessage title="Nothing to review" message="There are no submissions waiting for a decision." />
      )}
      {queue.status === 'ready' && queue.items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="visually-hidden">Records pending review</caption>
            <thead>
              <tr>
                <th scope="col">Site</th>
                <th scope="col">Kind</th>
                <th scope="col">Machine</th>
                <th scope="col">Quantity</th>
                <th scope="col">Technology</th>
                <th scope="col">Sources</th>
                <th scope="col">Last changed</th>
                <th scope="col"><span className="visually-hidden">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {queue.items.map((item) => (
                <tr key={`${item.kind}-${item.correctionId ?? item.id}`}>
                  <td><strong>{item.siteName}</strong><small>{[item.region, item.countryCode].filter(Boolean).join(', ')}</small></td>
                  <td>
                    <strong>{formatEnumLabel(item.kind)}</strong>
                    {item.changedFields.length > 0 && <small>{item.changedFields.map(formatEnumLabel).join(', ')}</small>}
                    {(item.contributorEmail || item.contributorOrganisation) && <small>{[item.contributorEmail, item.contributorOrganisation].filter(Boolean).join(' · ')}</small>}
                  </td>
                  <td>{[item.machineManufacturer, item.machineModel].filter(Boolean).join(' ')}<small>{formatEnumLabel(item.machineType)}</small></td>
                  <td>{formatNumber(item.quantity)}</td>
                  <td>{item.technologyProduct ? `${item.technologySupplier ?? ''} ${item.technologyProduct}`.trim() : <span className="admin-warning">Not recorded</span>}</td>
                  <td>{item.evidenceCount > 0 ? item.evidenceCount : <span className="admin-warning">None</span>}</td>
                  <td>{formatDateTime(item.submittedAt)}</td>
                  <td>
                    <Link
                      className="button button--secondary"
                      to={`/admin/deployments/${item.id}`}
                      aria-label={item.kind === 'correction' ? `Review correction ${item.correctionId} to ${item.siteName} record ${item.id}` : `Review ${item.siteName} record ${item.id}`}
                    >Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default AdminQueuePage
