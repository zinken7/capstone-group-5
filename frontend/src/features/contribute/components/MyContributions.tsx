import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { getOwnContribution, updateOwnContribution } from '../../../lib/api/contributions'
import { ApiError } from '../../../lib/api/errors'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import { formatDate, formatEnumLabel, formatNumber } from '../../../lib/format'
import StateMessage from '../../../shared/components/StateMessage'
import StatusBadge from '../../../shared/components/StatusBadge'
import MapIcon from '../../map/components/MapIcon'
import { useMyContributions } from '../my-contributions'
import type { TrackedContribution } from '../my-contributions'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../types'
import type { ContributionReferenceData, OwnContribution, OwnContributionUpdate, ReferenceOption } from '../types'

interface UpdateValues {
  quantity: string
  environment: string
  deploymentStatus: string
  automationLevel: string
  installationType: string
  commissioningDate: string
  evidenceUrl: string
  changeNote: string
  latitude: string
  longitude: string
  disclosureAccepted: boolean
}

function valuesOf(contribution: OwnContribution): UpdateValues {
  return {
    quantity: String(contribution.quantity),
    environment: contribution.environment ?? '',
    deploymentStatus: contribution.deploymentStatus ?? '',
    automationLevel: contribution.automationLevel,
    installationType: contribution.installationType,
    commissioningDate: contribution.commissioningDate ?? '',
    evidenceUrl: '',
    changeNote: '',
    latitude: '',
    longitude: '',
    disclosureAccepted: false,
  }
}

/** The fields that differ from the submission, checked as the API checks them; or what to fix first. */
function changesFrom(before: UpdateValues, values: UpdateValues): OwnContributionUpdate | { errors: Record<string, string>; message: string } {
  const errors: Record<string, string> = {}
  const quantity = Number(values.quantity)
  if (values.quantity !== before.quantity && (!Number.isInteger(quantity) || quantity < 1)) errors.quantity = 'Enter a whole number of machines, 1 or more.'
  const commissioning = values.commissioningDate.trim()
  if (commissioning !== before.commissioningDate && commissioning && !/^\d{4}(-\d{2}-\d{2})?$/.test(commissioning)) errors.commissioning_date = 'Enter a year (2024) or a date (2024-03-01).'
  const url = values.evidenceUrl.trim()
  if (url && !/^https?:\/\/\S+$/i.test(url)) errors.evidence_urls = 'Enter an address that starts with http:// or https://.'
  const latitude = values.latitude.trim()
  const longitude = values.longitude.trim()
  if (latitude || longitude) {
    if (!latitude || !(Math.abs(Number(latitude)) <= 90)) errors.latitude = 'Enter a latitude between -90 and 90.'
    if (!longitude || !(Math.abs(Number(longitude)) <= 180)) errors.longitude = 'Enter a longitude between -180 and 180.'
  }
  if (!values.disclosureAccepted) errors.disclosure_accepted = 'Confirm the information before sending it.'
  if (Object.keys(errors).length > 0) return { errors, message: 'Check the highlighted fields.' }

  const update: OwnContributionUpdate = {}
  if (values.quantity !== before.quantity) update.quantity = quantity
  if (values.environment && values.environment !== before.environment) update.environment = values.environment
  if (values.deploymentStatus && values.deploymentStatus !== before.deploymentStatus) update.deploymentStatus = values.deploymentStatus
  if (values.automationLevel !== before.automationLevel) update.automationLevel = values.automationLevel
  if (values.installationType !== before.installationType) update.installationType = values.installationType
  if (commissioning && commissioning !== before.commissioningDate) update.commissioningDate = commissioning
  if (url) update.evidenceUrls = [url]
  if (latitude && longitude) {
    update.latitude = Number(latitude)
    update.longitude = Number(longitude)
  }
  if (Object.keys(update).length === 0) return { errors: {}, message: 'Change at least one detail or add a source before sending.' }
  if (values.changeNote.trim()) update.changeNote = values.changeNote.trim()
  return update
}

/** Options with the record's own value first when the list does not hold it */
function withCurrent(options: readonly ReferenceOption[], value: string): readonly ReferenceOption[] {
  return !value || options.some(([option]) => option === value) ? options : [[value, formatEnumLabel(value)], ...options]
}

interface UpdateFormProps {
  item: TrackedContribution
  onSent: () => void
  onCancel: () => void
  /** The request was no longer open, for example because the submission was decided meanwhile */
  onStale: () => void
}

/** Answers a request for changes; what is sent goes back to the review queue (FR-46, FR-59). */
function UpdateForm({ item, onSent, onCancel, onStale }: UpdateFormProps) {
  const { setStatus } = useMyContributions()
  const [contribution, setContribution] = useState<OwnContribution | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reference, setReference] = useState<ContributionReferenceData>(DEFAULT_CONTRIBUTION_REFERENCE_DATA)
  const [values, setValues] = useState<UpdateValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const prefix = `update-${item.id}`

  useEffect(() => {
    let active = true
    getOwnContribution(item.id, item.key)
      .then((loaded) => {
        if (!active) return
        setContribution(loaded)
        setValues(valuesOf(loaded))
        // The first field takes focus once the submission has loaded
        window.setTimeout(() => firstFieldRef.current?.focus(), 0)
      })
      .catch((cause: unknown) => active && setLoadError(cause instanceof Error ? cause.message : 'The submission could not be loaded.'))
    getContributionReferenceData().then((data) => active && setReference(data)).catch(() => undefined)
    return () => { active = false }
  }, [item.id, item.key])

  if (loadError) return <p className="form-summary-error" role="alert">{loadError}</p>
  if (!contribution || !values) return <p className="form-help" role="status">Loading your submission…</p>
  const before = valuesOf(contribution)

  function set(field: keyof UpdateValues, value: string | boolean) {
    setValues((current) => current && { ...current, [field]: value })
    setMessage(null)
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values) return
    const result = changesFrom(before, values)
    if ('errors' in result) {
      setErrors(result.errors)
      setMessage(result.message)
      return
    }
    setSending(true)
    setErrors({})
    setMessage(null)
    try {
      setStatus(item.id, await updateOwnContribution(item.id, item.key, result))
      onSent()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        onStale()
        return
      }
      if (cause instanceof ApiError) setErrors(cause.fields)
      setMessage(cause instanceof Error ? cause.message : 'The update could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const field = (name: string) => ({
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${prefix}-${name}-error` : undefined,
  })
  const error = (name: string) => errors[name] && <small id={`${prefix}-${name}-error`} className="field-error">{errors[name]}</small>
  const select = (name: keyof UpdateValues, apiName: string, label: string, options: readonly ReferenceOption[]) => (
    <div className="form-field">
      <label htmlFor={`${prefix}-${apiName}`}>{label}</label>
      <select id={`${prefix}-${apiName}`} value={values[name] as string} onChange={(event) => set(name, event.target.value)} {...field(apiName)}>
        {(name === 'environment' || name === 'deploymentStatus') && <option value="">Not recorded</option>}
        {withCurrent(options, values[name] as string).map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
      {error(apiName)}
    </div>
  )

  return (
    <form className="my-contribution__form" onSubmit={(event) => void send(event)} noValidate aria-label={`Update submission ${item.id}`}>
      <p className="form-help">Change what the reviewer asked about, or add a source. Site, manufacturer, model and machine type cannot be changed here; if those are wrong, submit a new contribution.</p>
      {message && <p className="form-summary-error" role="alert">{message}</p>}
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor={`${prefix}-quantity`}>Quantity</label>
          <input ref={firstFieldRef} id={`${prefix}-quantity`} inputMode="numeric" value={values.quantity} onChange={(event) => set('quantity', event.target.value)} {...field('quantity')} />
          {error('quantity')}
        </div>
        {select('environment', 'environment', 'Mining environment', reference.environments)}
        {select('deploymentStatus', 'deployment_status', 'Deployment status', reference.deploymentStatuses)}
        {select('automationLevel', 'automation_level', 'Automation level', reference.automationLevels)}
        {select('installationType', 'installation_type', 'Installation type', reference.installationTypes)}
        <div className="form-field">
          <label htmlFor={`${prefix}-commissioning_date`}>Commissioning date or year</label>
          <input id={`${prefix}-commissioning_date`} placeholder="YYYY or YYYY-MM-DD" value={values.commissioningDate} onChange={(event) => set('commissioningDate', event.target.value)} {...field('commissioning_date')} />
          {error('commissioning_date')}
        </div>
        {/* Approval needs the site's location; a site that has one is shared, so it is not changed here */}
        {contribution.latitude === null && (
          <fieldset className="form-field--wide my-contribution__location">
            <legend>Site location</legend>
            <p className="form-help">The site has no location yet, and a submission needs one before it can be approved.</p>
            <div className="my-contribution__location-fields">
              <div className="form-field">
                <label htmlFor={`${prefix}-latitude`}>Latitude</label>
                <input id={`${prefix}-latitude`} inputMode="decimal" placeholder="-22.3" value={values.latitude} onChange={(event) => set('latitude', event.target.value)} {...field('latitude')} />
                {error('latitude')}
              </div>
              <div className="form-field">
                <label htmlFor={`${prefix}-longitude`}>Longitude</label>
                <input id={`${prefix}-longitude`} inputMode="decimal" placeholder="118.7" value={values.longitude} onChange={(event) => set('longitude', event.target.value)} {...field('longitude')} />
                {error('longitude')}
              </div>
            </div>
          </fieldset>
        )}
        <div className="form-field form-field--wide">
          <label htmlFor={`${prefix}-evidence_urls`}>New source URL <span className="form-help-inline">(recommended)</span></label>
          <input id={`${prefix}-evidence_urls`} type="url" placeholder="https://" value={values.evidenceUrl} onChange={(event) => set('evidenceUrl', event.target.value)} {...field('evidence_urls')} />
          {error('evidence_urls')}
          {contribution.evidenceUrls.length > 0 && <small className="form-help">Already supplied: {contribution.evidenceUrls.join(', ')}</small>}
        </div>
        <div className="form-field form-field--wide">
          <label htmlFor={`${prefix}-change_note`}>Note to the reviewer <span className="form-help-inline">(optional)</span></label>
          <textarea id={`${prefix}-change_note`} rows={3} maxLength={1000} value={values.changeNote} onChange={(event) => set('changeNote', event.target.value)} />
        </div>
      </div>
      <label className="disclosure-check" htmlFor={`${prefix}-disclosure_accepted`}>
        <input id={`${prefix}-disclosure_accepted`} type="checkbox" checked={values.disclosureAccepted} onChange={(event) => set('disclosureAccepted', event.target.checked)} {...field('disclosure_accepted')} />
        <span>I confirm that this information is accurate and that I am authorised to disclose it.</span>
      </label>
      {error('disclosure_accepted')}
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send for review'}</button>
        <button className="button button--secondary" type="button" onClick={onCancel} disabled={sending}>Cancel</button>
      </div>
    </form>
  )
}

/** One submission: what it is, where its review stands, and what the contributor can do next */
function ContributionRow({ item, onResubmit }: { item: TrackedContribution; onResubmit: (item: TrackedContribution) => Promise<void> }) {
  const { remove, refresh } = useMyContributions()
  const [editing, setEditing] = useState(false)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const updateButtonRef = useRef<HTMLButtonElement>(null)
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const status = item.missing ? null : item.last?.verificationStatus ?? 'pending_review'
  const decision = item.last?.decision
  const showNote = decision?.note && (status === 'changes_requested' || status === 'rejected')
  const titleId = `my-contribution-${item.id}`

  return (
    <li className="my-contribution" aria-labelledby={titleId}>
      <div className="my-contribution__summary">
        <p className="my-contribution__ref">#{item.id} · submitted {formatDate(item.submittedAt.slice(0, 10))}{item.last?.resubmissionOf ? ` · replaces #${item.last.resubmissionOf}` : ''}</p>
        <h3 id={titleId} className="my-contribution__title">
          {item.siteName} · {item.machine}{item.last ? ` × ${formatNumber(item.last.quantity)}` : ''}
        </h3>
        <p className="my-contribution__state">
          {status ? <StatusBadge status={status} /> : <span className="my-contribution__missing">No longer available</span>}
          {status && decision && status !== 'pending_review' && <span>{formatDate(decision.decidedAt.slice(0, 10))}</span>}
        </p>
      </div>
      {showNote && (
        <div className={`my-contribution__note my-contribution__note--${status}`}>
          <p className="my-contribution__note-label">{status === 'rejected' ? 'Reason' : 'What the reviewer asked'}</p>
          <p>{decision?.note}</p>
        </div>
      )}
      {status === 'rejected' && (item.last?.resubmittedAs
        ? <p className="form-help my-contribution__wide">This submission is closed. You resubmitted it as #{item.last.resubmittedAs}.</p>
        : <p className="form-help my-contribution__wide">This submission is closed. Resubmit it to correct the details: the form opens with what you sent, and the new submission stays linked to this one.</p>)}
      {openError && <p className="form-summary-error my-contribution__wide" role="alert">{openError}</p>}
      {status === 'pending_review' && <p className="form-help my-contribution__wide">Waiting for review. You will see the decision here; until then you can still add a source or fix a detail.</p>}
      {item.missing && <p className="form-help my-contribution__wide">The site no longer reports this submission. You can remove it from this browser.</p>}
      {notice && <p className="form-summary-success my-contribution__wide" role="status">{notice}</p>}
      {editing && (
        <div className="my-contribution__wide">
          <UpdateForm
            item={item}
            onSent={() => {
              setEditing(false)
              setNotice(status === 'pending_review' ? 'Saved. It is still waiting for review, now with your changes.' : 'Sent for review. The reviewer sees what you changed.')
            }}
            onCancel={() => { setEditing(false); window.setTimeout(() => updateButtonRef.current?.focus(), 0) }}
            onStale={() => { setEditing(false); setNotice('This submission has been decided meanwhile, so it can no longer be updated. Its status has been checked again.'); refresh() }}
          />
        </div>
      )}
      {/* After the request in reading order; on wide screens it sits beside the summary */}
      <div className="my-contribution__actions">
        {/* Answering a request comes first; while waiting, a source or detail can still be added */}
        {(status === 'changes_requested' || status === 'pending_review') && !editing && (
          <button ref={updateButtonRef} className={status === 'changes_requested' ? 'button button--primary' : 'button button--secondary'} type="button" onClick={() => { setEditing(true); setNotice(null) }}>Update submission</button>
        )}
        {status === 'rejected' && !item.last?.resubmittedAs && (
          <button
            className="button button--primary"
            type="button"
            disabled={opening}
            onClick={() => {
              setOpening(true)
              setOpenError(null)
              onResubmit(item)
                .catch((cause: unknown) => setOpenError(cause instanceof Error ? cause.message : 'The submission could not be opened.'))
                .finally(() => setOpening(false))
            }}
          >
            {opening ? 'Opening…' : 'Resubmit'}
          </button>
        )}
        {status === 'verified' && item.last && (
          <Link className="button button--secondary" to={`/equipment?site_id=${item.last.siteId}`}>View on register</Link>
        )}
      </div>
      {!editing && <div className="my-contribution__remove">
        {confirmingRemoval ? (
          <div className="my-contribution__confirm" role="group" aria-label={`Remove submission ${item.id} from this browser`}>
            <span>Remove #{item.id} from this browser? You will not be able to follow it here again.</span>
            <button className="button button--secondary" type="button" onClick={() => remove(item.id)}>Remove</button>
            <button className="text-button" type="button" autoFocus onClick={() => { setConfirmingRemoval(false); window.setTimeout(() => removeButtonRef.current?.focus(), 0) }}>Keep</button>
          </div>
        ) : (
          <button ref={removeButtonRef} className="text-button text-button--flush" type="button" onClick={() => setConfirmingRemoval(true)}>Remove from this browser</button>
        )}
      </div>}
    </li>
  )
}

/** The submissions made from this browser, with their review status (FR-59) */
function MyContributions({ onStartNew, onResubmit }: { onStartNew: () => void; onResubmit: (item: TrackedContribution) => Promise<void> }) {
  const { items, checking, checkFailed, refresh } = useMyContributions()

  if (items.length === 0) {
    return (
      <div className="my-contributions">
        <StateMessage title="No contributions in this browser yet" message="Submissions you make here are listed with their review status, so you can come back to them without an account." />
        <div className="form-actions"><button className="button button--primary" type="button" onClick={onStartNew}>Contribute a deployment</button></div>
      </div>
    )
  }

  return (
    <div className="my-contributions">
      <div className="my-contributions__bar">
        <p className="form-help">Kept in this browser only. Statuses are checked each time you open the site.</p>
        {checking
          ? <span className="form-help" role="status">Checking…</span>
          : <button className="text-button" type="button" onClick={refresh}><MapIcon name="reset" size={16} /> Check again</button>}
      </div>
      {checkFailed && <p className="form-summary-error" role="alert">The latest statuses could not be checked. These are the last ones known.</p>}
      <ul className="my-contributions__list">
        {items.map((item) => <ContributionRow key={item.id} item={item} onResubmit={onResubmit} />)}
      </ul>
    </div>
  )
}

export default MyContributions
