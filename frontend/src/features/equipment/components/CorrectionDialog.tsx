import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { submitCorrection, CorrectionApiError } from '../../../lib/api/corrections'
import type { CorrectionResult } from '../../../lib/api/corrections'
import type { CorrectionPayload } from '../../../lib/api/corrections'
import { formatCommissioning, formatEnumLabel, formatNumber } from '../../../lib/format'
import type { ContributionReferenceData, ReferenceOption } from '../../contribute/types'
import type { EquipmentRecord } from '../types'

interface CorrectionDialogProps {
  record: EquipmentRecord
  referenceData: ContributionReferenceData
  onClose: () => void
  onSubmitted: (result: CorrectionResult) => void
}

interface CorrectionValues {
  quantity: string
  environment: string
  deploymentStatus: string
  automationLevel: string
  installationType: string
  commissioningDate: string
  evidenceUrl: string
  contributorEmail: string
  organisation: string
  changeNote: string
  disclosureAccepted: boolean
}

function controlValue(value: string | undefined): string {
  if (!value || value === 'Not recorded' || value === 'unknown') return ''
  return value.toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')
}

function initialValues(record: EquipmentRecord): CorrectionValues {
  return {
    quantity: String(record.quantity),
    environment: controlValue(record.environment),
    deploymentStatus: record.status === 'unknown' ? '' : record.status,
    automationLevel: controlValue(record.automationLevel),
    installationType: controlValue(record.installationType),
    commissioningDate: record.commissioningDate ?? '',
    evidenceUrl: '',
    contributorEmail: '',
    organisation: '',
    changeNote: '',
    disclosureAccepted: false,
  }
}

function optionsWithCurrent(options: readonly ReferenceOption[], value: string): readonly ReferenceOption[] {
  if (!value || options.some(([option]) => option === value)) return options
  return [[value, value.replaceAll('_', ' ')], ...options]
}

function getPayload(record: EquipmentRecord, values: CorrectionValues): CorrectionPayload | { message: string; fields?: Record<string, string> } {
  const before = initialValues(record)
  const fields: Record<string, string> = {}
  if (!values.disclosureAccepted) fields.disclosure_accepted = 'Please confirm the disclosure before submitting.'

  const quantity = Number(values.quantity)
  if (values.quantity !== before.quantity && (!Number.isInteger(quantity) || quantity < 1)) fields.quantity = 'Quantity must be a positive whole number.'
  if (values.evidenceUrl.trim() && !/^https?:\/\/\S+$/i.test(values.evidenceUrl.trim())) fields.evidence_urls = 'Evidence must be an http or https URL.'
  if (values.contributorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contributorEmail.trim())) fields.contributor_email = 'Enter a valid email address or leave this field blank.'
  if (Object.keys(fields).length > 0) return { message: 'Please correct the highlighted fields.', fields }

  const payload: CorrectionPayload = { disclosureAccepted: true }
  let changed = false
  if (values.quantity !== before.quantity) { payload.quantity = quantity; changed = true }
  if (values.environment && values.environment !== before.environment) { payload.environment = values.environment; changed = true }
  if (values.deploymentStatus && values.deploymentStatus !== before.deploymentStatus) { payload.deploymentStatus = values.deploymentStatus; changed = true }
  if (values.automationLevel && values.automationLevel !== before.automationLevel) { payload.automationLevel = values.automationLevel; changed = true }
  if (values.installationType && values.installationType !== before.installationType) { payload.installationType = values.installationType; changed = true }
  if (values.commissioningDate.trim() && values.commissioningDate.trim() !== before.commissioningDate) { payload.commissioningDate = values.commissioningDate.trim(); changed = true }
  if (values.evidenceUrl.trim()) { payload.evidenceUrls = [values.evidenceUrl.trim()]; changed = true }
  if (values.contributorEmail.trim()) payload.contributorEmail = values.contributorEmail.trim()
  if (values.organisation.trim()) payload.organisation = values.organisation.trim()
  if (values.changeNote.trim()) payload.changeNote = values.changeNote.trim()
  if (!changed) return { message: 'Change at least one field or add an evidence URL.' }
  return payload
}

function SelectField({ id, label, value, options, error, onChange }: { id: string; label: string; value: string; options: readonly ReferenceOption[]; error?: string; onChange: (value: string) => void }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}><option value="">Not recorded</option>{options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}</select>{error && <small id={`${id}-error`} className="field-error">{error}</small>}</div>
}

function CorrectionDialog({ record, referenceData, onClose, onSubmitted }: CorrectionDialogProps) {
  const [values, setValues] = useState(() => initialValues(record))
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstFieldRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  function set(field: keyof CorrectionValues, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => { const next = { ...current }; delete next[field]; return next })
    setError(null)
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = getPayload(record, values)
    if ('message' in result) { setError(result.message); setFieldErrors(result.fields ?? {}); return }
    setSubmitting(true)
    setError(null)
    setFieldErrors({})
    try {
      onSubmitted(await submitCorrection(Number(record.id), result))
    } catch (cause) {
      if (cause instanceof CorrectionApiError) setFieldErrors(cause.fields)
      setError(cause instanceof Error ? cause.message : 'Unable to submit the correction.')
    } finally {
      setSubmitting(false)
    }
  }

  const setText = (field: keyof CorrectionValues) => (event: React.ChangeEvent<HTMLInputElement>) => set(field, event.target.value)
  const environmentOptions = optionsWithCurrent(referenceData.environments, values.environment)
  const statusOptions = optionsWithCurrent(referenceData.deploymentStatuses, values.deploymentStatus)
  const automationOptions = optionsWithCurrent(referenceData.automationLevels, values.automationLevel)
  const installationOptions = optionsWithCurrent(referenceData.installationTypes, values.installationType)

  return <div className="correction-overlay" role="presentation"><div ref={dialogRef} className="correction-dialog" role="dialog" aria-modal="true" aria-labelledby="equipment-correction-title" aria-describedby="equipment-correction-description" onKeyDown={trapFocus}>
    <div className="correction-dialog__header"><div><p className="eyebrow">Suggest a correction</p><h2 id="equipment-correction-title">Correct this record</h2></div><button className="icon-button" type="button" aria-label="Close correction dialog" onClick={onClose}>×</button></div>
    <p id="equipment-correction-description" className="form-help">Propose a change to <strong>{record.siteName}</strong>. An administrator will review it before it becomes public.</p>
    <dl className="correction-record-summary"><div><dt>Machine</dt><dd>{record.machineModel ?? 'Not recorded'} · {formatEnumLabel(record.machineType)}<small>{record.manufacturer}</small></dd></div><div><dt>Supplier</dt><dd>{record.supplier || 'Not recorded'}</dd></div><div><dt>Current quantity</dt><dd>{formatNumber(record.quantity)}</dd></div><div><dt>Current status</dt><dd>{formatEnumLabel(record.status)}</dd></div><div><dt>Commissioned</dt><dd>{formatCommissioning(record.commissioningDate, undefined)}</dd></div></dl>
    <p className="correction-warning">An administrator reviews your correction before it is published. Until then, this record stays public and unchanged.</p>
    {error && <p className="form-summary-error" role="alert">{error}</p>}
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="form-grid">
        <div className="form-field"><label htmlFor="equipment-correction-quantity">Quantity</label><input ref={firstFieldRef} id="equipment-correction-quantity" inputMode="numeric" value={values.quantity} onChange={setText('quantity')} aria-invalid={Boolean(fieldErrors.quantity)} aria-describedby={fieldErrors.quantity ? 'equipment-correction-quantity-error' : undefined} />{fieldErrors.quantity && <small id="equipment-correction-quantity-error" className="field-error">{fieldErrors.quantity}</small>}</div>
        <SelectField id="equipment-correction-environment" label="Mining environment" value={values.environment} options={environmentOptions} error={fieldErrors.environment} onChange={(value) => set('environment', value)} />
        <SelectField id="equipment-correction-status" label="Deployment status" value={values.deploymentStatus} options={statusOptions} error={fieldErrors.deployment_status} onChange={(value) => set('deploymentStatus', value)} />
        <SelectField id="equipment-correction-automation" label="Automation level" value={values.automationLevel} options={automationOptions} error={fieldErrors.automation_level} onChange={(value) => set('automationLevel', value)} />
        <SelectField id="equipment-correction-installation" label="Installation type" value={values.installationType} options={installationOptions} error={fieldErrors.installation_type} onChange={(value) => set('installationType', value)} />
        <div className="form-field"><label htmlFor="equipment-correction-commissioning">Commissioning date or year</label><input id="equipment-correction-commissioning" placeholder="YYYY or YYYY-MM-DD" value={values.commissioningDate} onChange={setText('commissioningDate')} aria-invalid={Boolean(fieldErrors.commissioning_date)} aria-describedby={fieldErrors.commissioning_date ? 'equipment-correction-commissioning-error' : undefined} />{fieldErrors.commissioning_date && <small id="equipment-correction-commissioning-error" className="field-error">{fieldErrors.commissioning_date}</small>}</div>
        <div className="form-field form-field--wide"><label htmlFor="equipment-correction-evidence">Evidence URL <span className="form-help-inline">(recommended)</span></label><input id="equipment-correction-evidence" type="url" placeholder="https://" value={values.evidenceUrl} onChange={setText('evidenceUrl')} aria-invalid={Boolean(fieldErrors.evidence_urls)} aria-describedby={fieldErrors.evidence_urls ? 'equipment-correction-evidence-error' : undefined} />{fieldErrors.evidence_urls && <small id="equipment-correction-evidence-error" className="field-error">{fieldErrors.evidence_urls}</small>}</div>
        <div className="form-field"><label htmlFor="equipment-correction-email">Contact email <span className="form-help-inline">(optional)</span></label><input id="equipment-correction-email" type="email" placeholder="you@example.com" value={values.contributorEmail} onChange={setText('contributorEmail')} aria-invalid={Boolean(fieldErrors.contributor_email)} aria-describedby={fieldErrors.contributor_email ? 'equipment-correction-email-error' : undefined} />{fieldErrors.contributor_email && <small id="equipment-correction-email-error" className="field-error">{fieldErrors.contributor_email}</small>}</div>
        <div className="form-field"><label htmlFor="equipment-correction-organisation">Organisation <span className="form-help-inline">(optional)</span></label><input id="equipment-correction-organisation" value={values.organisation} onChange={setText('organisation')} /></div>
        <p className="form-help form-field--wide">Contact details are used only if the project team needs clarification. They are not published in the public register.</p>
        <div className="form-field form-field--wide"><label htmlFor="equipment-correction-note">Note <span className="form-help-inline">(optional)</span></label><textarea id="equipment-correction-note" maxLength={1000} value={values.changeNote} onChange={(event) => set('changeNote', event.target.value)} /></div>
      </div>
      <label className="disclosure-check"><input type="checkbox" checked={values.disclosureAccepted} onChange={(event) => set('disclosureAccepted', event.target.checked)} /> <span>I confirm that this correction is accurate and may be reviewed by the project team.</span></label>
      {fieldErrors.disclosure_accepted && <p className="field-error" role="alert">{fieldErrors.disclosure_accepted}</p>}
      <div className="form-actions correction-dialog__actions"><button className="button button--secondary" type="button" onClick={onClose} disabled={submitting}>Cancel</button><button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit correction'}</button></div>
    </form>
  </div></div>
}

export default CorrectionDialog
