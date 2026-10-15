import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getReviewRecord, submitDecision } from '../../../lib/api/admin'
import { ApiError } from '../../../lib/api/errors'
import { formatCommissioning, formatDate, formatDateTime, formatEnumLabel, formatNumber } from '../../../lib/format'
import StateMessage from '../../../shared/components/StateMessage'
import StatusBadge from '../../../shared/components/StatusBadge'
import AdminBar from '../components/AdminBar'
import CorrectionForm from '../components/CorrectionForm'
import CorrectionReview from '../components/CorrectionReview'
import DecisionForm from '../components/DecisionForm'
import type { ApprovalBlocker } from '../components/DecisionForm'
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
      <>
        <AdminBar />
        <main className="admin-page" id="main-content" tabIndex={-1}>
          <StateMessage variant="error" title="Record not found" message="There is no deployment record with this id." />
          <p><Link to="/admin">Back to the review queue</Link></p>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminBar />
      <main className="admin-page" id="main-content" tabIndex={-1}>
        <p className="admin-back"><Link to="/admin">← Review queue</Link></p>
        {state.status === 'loading' && <StateMessage variant="loading" title="Loading the record" message="Fetching the record and its history." />}
        {state.status === 'error' && <StateMessage variant="error" title="Record unavailable" message={state.message} />}
        {state.status === 'ready' && <RecordView key={state.version} record={state.record} notice={notice} onChanged={load} />}
      </main>
    </>
  )
}

/** Editing stays out of the way until asked for; most reviews only need a decision. */
function EditRecordPanel({ record, onCorrected }: { record: ReviewRecord; onCorrected: () => void }) {
  const [open, setOpen] = useState(false)
  if (open) return <CorrectionForm record={record} onCorrected={onCorrected} onCancel={() => setOpen(false)} />
  return (
    <section className="admin-panel admin-edit" aria-labelledby="edit-heading">
      <h2 id="edit-heading">Fix a detail yourself</h2>
    <p className="form-help">Update quantity, status, automation, installation, commissioning, validity dates, technology or evidence. Site and machine identity stay fixed; submit a new contribution if those details are wrong. The previous values stay in the history.</p>
      <button className="button button--secondary" type="button" aria-expanded="false" onClick={() => setOpen(true)}>Edit record</button>
    </section>
  )
}

/** Statuses a decision can be recorded on (FR-45): changes requested too, so a record fixed here can be approved or a silent one closed */
const DECIDABLE = ['pending_review', 'changes_requested']

/** An email to the contributor, about this record */
function contactLink(email: string, record: ReviewRecord): string {
  const subject = `Your Mining Market Map submission (record ${record.id})`
  const body = `Hello,\n\nAbout your submission for ${record.siteName} (record ${record.id}):\n\n`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** What happens next for a record no decision can be made on */
function closedNotice(status: string): string {
  if (status === 'verified') return 'This record is verified. Corrections that contributors propose appear here for a decision; the public record stays as it is until then.'
  if (status === 'rejected') return 'This record is rejected and closed. It cannot be corrected or decided again; the contributor can submit it again as a new contribution.'
  return 'This record was loaded without review and is not in the review queue.'
}

function RecordView({ record, notice, onChanged }: { record: ReviewRecord; notice: string | null; onChanged: (message?: string) => void }) {
  const machine = [record.machineManufacturer, record.machineModel, record.modelVariant].filter(Boolean).join(' ')
  const pendingCorrections = record.corrections.filter((correction) => correction.status === 'pending')
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
    ['Site coordinates', record.latitude === null || record.longitude === null ? 'Not recorded' : `${record.latitude}, ${record.longitude}`],
    ['Commissioning', formatCommissioning(record.commissioningDate, record.commissioningYear)],
    ['In service', `${formatDate(record.validFrom)} to ${record.validTo ? formatDate(record.validTo) : 'present'}`],
  ]
  const decidable = DECIDABLE.includes(record.verificationStatus)
  // Who submitted it, for following up by email (FR-40, Section 7)
  const submitter = record.revisions.find((revision) => revision.action === 'create')
  // What approval needs (FR-44, FR-04) that a submission may lack, since both are optional when submitting (FR-07)
  const approvalBlockers: ApprovalBlocker[] = [
    ...(record.evidence.length === 0 ? [{ label: 'No evidence URL', request: 'a link to a public source (such as the operator\'s announcement)' }] : []),
    ...(record.latitude === null || record.longitude === null ? [{ label: 'No site coordinates', request: 'the site\'s latitude and longitude' }] : []),
  ]
  // The request a record with changes requested is waiting on: the latest decision on the record itself
  const request = record.verificationStatus === 'changes_requested'
    ? [...record.reviews].reverse().find((review) => review.correctionId === null)
    : undefined
  // A contributor's direct correction that returned this record to the queue; a verified record's proposals show above instead
  const latestCorrection = record.verificationStatus === 'pending_review'
    ? [...record.revisions].reverse().find((revision) => revision.action !== 'verification_change' && revision.administrator === null)
    : undefined
  // The status it came back from is shown by the heading, not as a changed field
  const changedEntries = Object.entries(latestCorrection?.previousValues ?? {}).filter(([field]) => field !== 'verification_status')
  // The request for changes this update answers
  const answered = latestCorrection?.previousValues?.verification_status === 'changes_requested'
    ? [...record.reviews].reverse().find((review) => review.correctionId === null && review.decision === 'needs_changes')
    : undefined

  return (
    <>
      <header className="admin-heading admin-heading--record">
        <div>
          <p className="admin-heading__eyebrow">Record {record.id}</p>
          <h1>{record.siteName}</h1>
          <p>{[machine, formatEnumLabel(record.machineType), `${formatNumber(record.quantity)} ${record.quantity === 1 ? 'machine' : 'machines'}`].filter(Boolean).join(' · ')}</p>
        </div>
        <StatusBadge status={record.verificationStatus} />
      </header>
      {notice && <p className="admin-notice admin-notice--success" role="status">{notice}</p>}

      <div className={decidable ? 'admin-record admin-record--decide' : 'admin-record'}>
        <div className="admin-record__main">
          {pendingCorrections.map((correction) => (
            <CorrectionReview key={correction.id} correction={correction} onDecided={() => onChanged('Decision on the correction recorded.')} />
          ))}

          {latestCorrection?.action === 'update' && latestCorrection.previousValues && <section className="admin-panel change-panel admin-record__lead" aria-labelledby="changes-heading">
            <h2 id="changes-heading">{answered ? 'Changes made on request' : 'What changed'}</h2>
            {answered && <>
              <p className="form-help">Answers the request from {answered.administrator}, {formatDateTime(answered.reviewedAt)}:</p>
              {answered.note && <blockquote>{answered.note}</blockquote>}
            </>}
            {latestCorrection.changeNote && <p className="form-help">{answered ? `The contributor's note: ${latestCorrection.changeNote}` : latestCorrection.changeNote}</p>}
            <dl className="change-list">
              {changedEntries.map(([field, before]) => (
                <div key={field}>
                  <dt>{formatEnumLabel(field)}</dt>
                  <dd><span>Before: {describeChangedValue(before)}</span><span>Proposed: {describeChangedValue(currentValueForField(record, field))}</span></dd>
                </div>
              ))}
            </dl>
          </section>}

          {record.possibleDuplicates.length > 0 && (
            <section
              className="admin-panel admin-record__lead"
              aria-labelledby="duplicates-heading"
            >
              <h2 id="duplicates-heading">Possible duplicate deployments</h2>
              <p className="admin-notice admin-notice--warning" role="status">
                {record.possibleDuplicates.length} possible matching
                {record.possibleDuplicates.length === 1 ? ' record was' : ' records were'}
                {' '}found at this site. Review them before making a decision.
              </p>
              <ul className="duplicate-list">
                {record.possibleDuplicates.map((duplicate) => (
                  <li key={duplicate.id}>
                    <Link to={`/admin/deployments/${duplicate.id}`}>
                      Record {duplicate.id}: {duplicate.machineManufacturer} {duplicate.machineModel ?? formatEnumLabel(duplicate.machineType)}
                    </Link>
                    <small>
                      {[
                        formatEnumLabel(duplicate.machineType),
                        `${formatNumber(duplicate.quantity)} ${duplicate.quantity === 1 ? 'machine' : 'machines'}`,
                        duplicate.technologyProduct ?? 'No product recorded',
                      ].join(' · ')}
                    </small>
                    <small className="duplicate-list__state">
                      <StatusBadge status={duplicate.verificationStatus} />
                      <span>
                        {formatEnumLabel(duplicate.status)} · {duplicate.commissioningDate ? `Commissioned ${formatCommissioning(duplicate.commissioningDate, null)}` : 'Commissioning date not recorded'}
                      </span>
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="admin-panel admin-record__rest" aria-labelledby="details-heading">
            <h2 id="details-heading">Details</h2>
            <dl className="record-fields">
              {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>

          <section className="admin-panel admin-record__rest" aria-labelledby="evidence-heading">
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

          <div className="admin-record__rest">
            <RecordHistory record={record} />
          </div>
        </div>

        <aside className="admin-record__side" aria-label="Decision and editing">
          {request && (
            <section className="admin-panel admin-waiting" aria-labelledby="waiting-heading">
              <h2 id="waiting-heading">Waiting for the contributor</h2>
              <p className="form-help">Changes requested by {request.administrator}, {formatDateTime(request.reviewedAt)}.</p>
              {request.note && <blockquote>{request.note}</blockquote>}
              <p className="form-help">If you fix the record yourself, approve it here. Reject it if the changes never arrive.</p>
            </section>
          )}
          {decidable && (
            <DecisionForm
              // A new form once the record changes what it lacks, so the starting decision and note follow it
              key={approvalBlockers.map((blocker) => blocker.label).join('|')}
              submit={(decision, note) => submitDecision(record.id, decision, note)}
              onDecided={() => onChanged('Decision recorded.')}
              noteShownToContributor
              approvalBlockers={approvalBlockers}
            />
          )}
          {!decidable && pendingCorrections.length === 0 && (
            <p className="admin-notice">{closedNotice(record.verificationStatus)}</p>
          )}
          {submitter && (
            <section className="admin-panel admin-contact" aria-labelledby="contact-heading">
              <h2 id="contact-heading">Contributor</h2>
              {submitter.contributorEmail ? (
                <>
                  <p>{[submitter.contributorEmail, submitter.contributorOrganisation].filter(Boolean).join(' · ')}</p>
                  <a className="button button--secondary" href={contactLink(submitter.contributorEmail, record)}>Email contributor</a>
                </>
              ) : (
                <p className="form-help">No contact email was given{submitter.contributorOrganisation ? ` (organisation: ${submitter.contributorOrganisation})` : ''}. The contributor sees your decisions under My contributions, in the browser they submitted from.</p>
              )}
            </section>
          )}
          {/* A rejected record is closed (FR-45) */}
          {record.verificationStatus !== 'rejected' && <EditRecordPanel record={record} onCorrected={() => onChanged('Correction saved.')} />}
        </aside>
      </div>
    </>
  )
}

export default AdminRecordPage
