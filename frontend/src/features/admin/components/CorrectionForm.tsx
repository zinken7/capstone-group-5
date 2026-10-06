import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { correctRecord } from '../../../lib/api/admin'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../../contribute/types'
import type { ContributionReferenceData, ReferenceOption } from '../../contribute/types'
import { useAdminSession } from '../session'
import type { AdminCorrection, ReviewRecord } from '../types'

interface CorrectionFormProps {
  record: ReviewRecord
  onCorrected: () => void
  /** Shows a Cancel button that closes the form without saving */
  onCancel?: () => void
}

function initialValues(record: ReviewRecord) {
  return {
    quantity: String(record.quantity),
    environment: record.environment ?? '',
    deploymentStatus: record.status ?? '',
    automationLevel: record.automationLevel ?? '',
    clearAutomationLevel: false,
    installationType: record.installationType,
    commissioningDate: record.commissioningDate ?? (record.commissioningYear === null ? '' : String(record.commissioningYear)),
    technologySupplier: record.technologySupplier ?? '',
    technologyProduct: record.technologyProduct ?? '',
    evidenceUrl: '',
    changeNote: '',
  }
}

type CorrectionFormValues = Omit<ReturnType<typeof initialValues>, 'clearAutomationLevel'> & { clearAutomationLevel?: boolean }

/** Builds a correction holding only the fields that differ from the record. */
export function buildCorrection(record: ReviewRecord, values: CorrectionFormValues): AdminCorrection | string {
  const before = initialValues(record)
  const correction: AdminCorrection = {}
  if (values.quantity !== before.quantity) {
    const quantity = Number(values.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) return 'Quantity must be a positive whole number.'
    correction.quantity = quantity
  }
  if (values.environment && values.environment !== before.environment) correction.environment = values.environment
  if (values.deploymentStatus && values.deploymentStatus !== before.deploymentStatus) correction.deploymentStatus = values.deploymentStatus
  if (values.clearAutomationLevel) correction.clearAutomationLevel = true
  else if (values.automationLevel && values.automationLevel !== before.automationLevel) correction.automationLevel = values.automationLevel
  if (values.installationType && values.installationType !== before.installationType) correction.installationType = values.installationType
  if (values.commissioningDate.trim() && values.commissioningDate.trim() !== before.commissioningDate) {
    correction.commissioningDate = values.commissioningDate.trim()
  }

  const supplier = values.technologySupplier.trim()
  const product = values.technologyProduct.trim()
  if (supplier !== before.technologySupplier || product !== before.technologyProduct) {
    if (!supplier || !product) return 'Enter both the technology supplier and the product.'
    correction.technologySupplier = supplier
    correction.technologyProduct = product
  }

  const url = values.evidenceUrl.trim()
  if (url) {
    if (!/^https?:\/\/\S+$/i.test(url)) return 'Evidence must be an http or https URL.'
    correction.evidenceUrls = [url]
  }

  if (Object.keys(correction).length === 0) return 'Change at least one field or add evidence.'
  if (values.changeNote.trim()) correction.changeNote = values.changeNote.trim()
  return correction
}

function Select({ id, label, value, options, onChange, clearable, onClear }: {
  id: string
  label: string
  value: string
  options: readonly ReferenceOption[]
  onChange: (value: string) => void
  clearable?: boolean
  onClear?: () => void
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => event.target.value === '__clear__' ? onClear?.() : onChange(event.target.value)}>
        {(!value || clearable) && <option value="">Not recorded</option>}
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        {clearable && <option value="__clear__">Clear level</option>}
      </select>
    </div>
  )
}

function CorrectionForm({ record, onCorrected, onCancel }: CorrectionFormProps) {
  const { handleError } = useAdminSession()
  const [values, setValues] = useState(() => initialValues(record))
  const [referenceData, setReferenceData] = useState<ContributionReferenceData>(DEFAULT_CONTRIBUTION_REFERENCE_DATA)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    // The defaults stay in place if the controlled values cannot be loaded
    getContributionReferenceData().then((data) => active && setReferenceData(data)).catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const set = (field: keyof ReturnType<typeof initialValues>) => (value: string) => setValues((current) => ({ ...current, [field]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const correction = buildCorrection(record, values)
    if (typeof correction === 'string') {
      setError(correction)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await correctRecord(record.id, correction)
      onCorrected()
    } catch (caught) {
      setError(handleError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-panel admin-edit" onSubmit={(event) => void handleSubmit(event)} noValidate aria-labelledby="correction-heading">
      <h2 id="correction-heading">Correct this record</h2>
      <p className="form-help">The previous values are kept in the revision history. The verification status does not change.</p>
      {error && <p className="form-summary-error" role="alert">{error}</p>}
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="correct-quantity">Quantity</label>
          <input id="correct-quantity" inputMode="numeric" value={values.quantity} onChange={(event) => set('quantity')(event.target.value)} />
        </div>
        <Select id="correct-environment" label="Mining environment" value={values.environment} options={referenceData.environments} onChange={set('environment')} />
        <Select id="correct-status" label="Deployment status" value={values.deploymentStatus} options={referenceData.deploymentStatuses} onChange={set('deploymentStatus')} />
        <Select
          id="correct-automation"
          label="Automation level"
          value={values.clearAutomationLevel ? '__clear__' : values.automationLevel}
          options={referenceData.automationLevels}
          clearable
          onChange={(value) => setValues((current) => ({ ...current, automationLevel: value, clearAutomationLevel: false }))}
          onClear={() => setValues((current) => ({ ...current, automationLevel: '', clearAutomationLevel: true }))}
        />
        <Select id="correct-installation" label="Installation type" value={values.installationType} options={referenceData.installationTypes} onChange={set('installationType')} />
        <div className="form-field">
          <label htmlFor="correct-commissioning">Commissioning date or year</label>
          <input id="correct-commissioning" placeholder="YYYY or YYYY-MM-DD" value={values.commissioningDate} onChange={(event) => set('commissioningDate')(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="correct-supplier">Technology supplier</label>
          <input id="correct-supplier" value={values.technologySupplier} onChange={(event) => set('technologySupplier')(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="correct-product">Technology product</label>
          <input id="correct-product" value={values.technologyProduct} onChange={(event) => set('technologyProduct')(event.target.value)} />
        </div>
        <div className="form-field form-field--wide">
          <label htmlFor="correct-evidence">Add evidence URL</label>
          <input id="correct-evidence" type="url" placeholder="https://" value={values.evidenceUrl} onChange={(event) => set('evidenceUrl')(event.target.value)} />
        </div>
        <div className="form-field form-field--wide">
          <label htmlFor="correct-note">Change note (optional)</label>
          <input id="correct-note" maxLength={1000} value={values.changeNote} onChange={(event) => set('changeNote')(event.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save correction'}
        </button>
        {onCancel && <button className="button button--secondary" type="button" onClick={onCancel} disabled={submitting}>Cancel</button>}
      </div>
    </form>
  )
}

export default CorrectionForm
