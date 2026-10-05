import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getReviewRecord } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/errors'
import { formatCommissioning, formatDate, formatEnumLabel, formatNumber } from '../../../lib/format'
import StateMessage from '../../../shared/components/StateMessage'
import StatusBadge from '../../../shared/components/StatusBadge'
import AdminBar from '../components/AdminBar'
import CorrectionForm from '../components/CorrectionForm'
import DecisionForm from '../components/DecisionForm'
import RecordHistory from '../components/RecordHistory'
import { useAdminSession } from '../session'
import type { ReviewRecord } from '../types'
import '../admin.css'

type RecordState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; record: ReviewRecord; version: number }

function describeChangedValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not recorded'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None'
  return String(value)
}

function currentValueForField(record: ReviewRecord, field: string): unknown {
  const values: Record<string, unknown> = {
    quantity: record.quantity,
    environment: record.environment,
    deployment_status: record.status,
    automation_level: record.automationLevel,
    installation_type: record.installationType,
    commissioning_date: record.commissioningDate ?? record.commissioningYear,
    technology_supplier: record.technologySupplier,
    technology_product: record.technologyProduct,
    evidence_urls: record.evidence.map((item) => item.url),
    verification_status: record.verificationStatus,
  }
  return values[field]
}

function AdminRecordPage() {
  const { id } = useParams()
  const recordId = Number(id)
  const { handleError } = useAdminSession()
  const [state, setState] = useState<RecordState>({ status: 'loading' })
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback((message?: string) => {
    getReviewRecord(recordId)
      .then((record) => {
        // A new version remounts the forms with the saved values
        setState((current) => ({ status: 'ready', record, version: current.status === 'ready' ? current.version + 1 : 0 }))
        setNotice(message ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) setState({ status: 'not-found' })
        else setState({ status: 'error', message: handleError(error) })
      })
  }, [recordId, handleError])

  useEffect(() => {
    if (Number.isSafeInteger(recordId) && recordId > 0) load()
  }, [recordId, load])

  if (!Number.isSafeInteger(recordId) || recordId <= 0 || state.status === 'not-found') {
    return (
      <section className="product-page admin-page">
        <AdminBar />
        <StateMessage variant="error" title="Record not found" message="There is no deployment record with this id." />
        <p><Link to="/admin">Back to the review queue</Link></p>
      </section>
    )
  }

  return (
    <section className="product-page admin-page">
      <AdminBar />
      <p className="admin-back"><Link to="/admin">← Review queue</Link></p>
      {state.status === 'loading' && <StateMessage variant="loading" title="Loading the record" message="Fetching the record and its history." />}
      {state.status === 'error' && <StateMessage variant="error" title="Record unavailable" message={state.message} />}
      {state.status === 'ready' && <RecordView key={state.version} record={state.record} notice={notice} onChanged={load} />}
    </section>
  )
}

function RecordView({ record, notice, onChanged }: { record: ReviewRecord; notice: string | null; onChanged: (message?: string) => void }) {
  const machine = [record.machineManufacturer, record.machineModel, record.modelVariant].filter(Boolean).join(' ')
  const fields: [string, string][] = [
    ['Site', [record.siteName, record.region, record.countryCode].filter(Boolean).join(', ')],
    ['Commodity', formatEnumLabel(record.commodity)],
    ['Machine', machine],
    ['Machine type', formatEnumLabel(record.machineType)],
    ['Quantity', formatNumber(record.quantity)],
    ['Technology', record.technologyProduct ? `${record.technologySupplier ?? ''} ${record.technologyProduct}`.trim() : 'Not recorded'],
    ['Automation level', formatEnumLabel(record.automationLevel)],
    ['Mining environment', formatEnumLabel(record.environment)],
    ['Deployment status', formatEnumLabel(record.status)],
    ['Installation type', formatEnumLabel(record.installationType)],
    ['Commissioning', formatCommissioning(record.commissioningDate, record.commissioningYear)],
    ['In service', `${formatDate(record.validFrom)} to ${record.validTo ? formatDate(record.validTo) : 'present'}`],
  ]
  const latestCorrection = [...record.revisions].reverse().find((revision) => revision.action === 'update' && revision.previousValues)

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Record {record.id}</p>
          <h1>{record.siteName}</h1>
          <p className="intro">
            <StatusBadge status={record.verificationStatus} />
          </p>
        </div>
      </header>
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      <div className="admin-record">
        {latestCorrection?.previousValues && <section className="admin-panel change-panel" aria-labelledby="changes-heading">
          <h2 id="changes-heading">What changed</h2>
          {latestCorrection.changeNote && <p className="form-help">{latestCorrection.changeNote}</p>}
          <dl className="change-list">
            {Object.entries(latestCorrection.previousValues).map(([field, before]) => (
              <div key={field}>
                <dt>{formatEnumLabel(field)}</dt>
                <dd><span>Before: {describeChangedValue(before)}</span><span>Proposed: {describeChangedValue(currentValueForField(record, field))}</span></dd>
              </div>
            ))}
          </dl>
        </section>}
        <section className="admin-panel" aria-labelledby="details-heading">
          <h2 id="details-heading">Details</h2>
          <dl className="record-fields">
            {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>

        <section className="admin-panel" aria-labelledby="evidence-heading">
          <h2 id="evidence-heading">Evidence</h2>
          {record.evidence.length === 0 ? (
            <p className="admin-warning">No evidence supplied. A record needs at least one evidence URL before it can be approved.</p>
          ) : (
            <ul className="evidence-links">
              {record.evidence.map((item) => (
                <li key={item.url}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                  <small>{[formatEnumLabel(item.sourceType), item.publisher, formatDate(item.publishedDate)].filter(Boolean).join(' · ')}</small>
                </li>
              ))}
            </ul>
          )}
        </section>

        {record.verificationStatus === 'pending_review'
          ? <DecisionForm recordId={record.id} onDecided={() => onChanged('Decision recorded.')} />
          : <p className="admin-notice">Decisions apply to records pending review. A correction from a contributor returns a record to the queue.</p>}

        <CorrectionForm record={record} onCorrected={() => onChanged('Correction saved.')} />
        <RecordHistory record={record} />
      </div>
    </>
  )
}

export default AdminRecordPage
