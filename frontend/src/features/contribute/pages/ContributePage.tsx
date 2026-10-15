import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { getOwnContribution, postContribution } from '../../../lib/api/contributions'
import { formatEnumLabel } from '../../../lib/format'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import StateMessage from '../../../shared/components/StateMessage'
import MapIcon from '../../map/components/MapIcon'
import CopyTrackingLink from '../components/CopyTrackingLink'
import MyContributions from '../components/MyContributions'
import { groupContributions, useMyContributions } from '../my-contributions'
import type { TrackedContribution } from '../my-contributions'
import {
  COUNTRIES,
  DEFAULT_CONTRIBUTION_REFERENCE_DATA,
  EMPTY_CONTRIBUTION_FORM,
  type ContributionErrors,
  type ContributionFormValues,
  type ContributionReferenceData,
  type ContributionVerificationStatus,
  type ContributionSubmitter,
  type OwnContribution,
} from '../types'
import { hasContributionErrors, validateContribution } from '../validation'
import '../contribute.css'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'
type TextField = Exclude<keyof ContributionFormValues, 'evidenceUrls' | 'disclosureAccepted'>

export interface ContributePageProps {
  submitContribution?: ContributionSubmitter
  referenceData?: ContributionReferenceData
  referenceDataLoading?: boolean
  loadReferenceData?: () => Promise<ContributionReferenceData>
}

function submissionMessage(status: ContributionVerificationStatus, id?: number, tracked = false): string {
  const reference = typeof id === 'number'
    ? tracked
      ? ` Your submission reference is #${id}. Follow its review, and answer any request for changes, under My contributions in this browser.`
      : ` Your submission reference is #${id}. Keep it if the team needs to follow up.`
    : ''
  if (status === 'verified') {
    return `Your contribution has been received and marked as verified. It is now eligible for the public verified views.${reference}`
  }
  if (status === 'rejected') {
    return `Your contribution was received but rejected during review, so it will not be published.${reference}`
  }
  if (status === 'unverified') {
    return `Your contribution has been received as unverified. It remains hidden from the public verified views until review.${reference}`
  }
  return `Your contribution has been received and is pending review. It will become part of the public verified views after review.${reference}`
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p className="form-error" id={id} role="alert">{message}</p>
}

/** A rejected submission being sent again: the form starts from it, and the new one is linked to it (FR-60) */
interface Resubmission {
  id: number
  key: string
  reason: string | null
  values: ContributionFormValues
}

/** The form values a resubmission starts from: everything that was sent, except the contact details */
function formValuesFrom(contribution: OwnContribution): ContributionFormValues {
  return {
    siteName: contribution.siteName,
    countryCode: contribution.countryCode,
    latitude: contribution.latitude === null ? '' : String(contribution.latitude),
    longitude: contribution.longitude === null ? '' : String(contribution.longitude),
    region: contribution.region ?? '',
    commodity: contribution.commodity ?? '',
    machineType: contribution.machineType,
    manufacturer: contribution.machineManufacturer,
    machineModel: contribution.machineModel ?? '',
    machineModelVariant: contribution.machineModelVariant ?? '',
    quantity: String(contribution.quantity),
    environment: contribution.environment ?? '',
    deploymentStatus: contribution.deploymentStatus ?? '',
    automationLevel: contribution.automationLevel,
    installationType: contribution.installationType,
    technologySupplier: contribution.technologySupplier,
    technologyProduct: contribution.technologyProduct ?? '',
    commissioningDate: contribution.commissioningDate ?? '',
    evidenceUrls: contribution.evidenceUrls.length > 0 ? [...contribution.evidenceUrls] : [''],
    email: '',
    organisation: '',
    disclosureAccepted: false,
  }
}

interface NewContributionProps extends ContributePageProps {
  /** Shows the My contributions tab, from the confirmation */
  onShowMine: () => void
  resubmission: Resubmission | null
  /** Back to a blank form */
  onClearResubmission: () => void
}

/** The submission form, its loading and failure states, and the confirmation */
function NewContribution({
  submitContribution = postContribution,
  referenceData: providedReferenceData,
  referenceDataLoading = false,
  loadReferenceData = getContributionReferenceData,
  onShowMine,
  resubmission,
  onClearResubmission,
}: NewContributionProps) {
  const { add, markResubmitted } = useMyContributions()
  // The submission this browser now follows, with the key its tracking link carries
  const [tracked, setTracked] = useState<{ id: number; key: string } | null>(null)
  const [values, setValues] = useState<ContributionFormValues>(() => resubmission?.values ?? { ...EMPTY_CONTRIBUTION_FORM, evidenceUrls: [''] })
  const [errors, setErrors] = useState<ContributionErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  // A resubmission shows every detail it carries, so nothing sent before is hidden
  const [showMoreDetails, setShowMoreDetails] = useState(Boolean(resubmission))
  const [loadedReferenceData, setLoadedReferenceData] = useState<ContributionReferenceData | undefined>(providedReferenceData)
  const [loadingReferenceData, setLoadingReferenceData] = useState(!providedReferenceData && !referenceDataLoading)
  const [referenceDataError, setReferenceDataError] = useState(false)

  useEffect(() => {
    if (providedReferenceData || referenceDataLoading) return

    let cancelled = false

    loadReferenceData()
      .then((data) => {
        if (cancelled) return
        setLoadedReferenceData(data)
        setLoadingReferenceData(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadedReferenceData(undefined)
        setLoadingReferenceData(false)
        setReferenceDataError(true)
      })

    return () => {
      cancelled = true
    }
  }, [loadReferenceData, providedReferenceData, referenceDataLoading])

  const referenceData = providedReferenceData ?? loadedReferenceData ?? DEFAULT_CONTRIBUTION_REFERENCE_DATA
  const referenceDataIsLoading = referenceDataLoading || loadingReferenceData
  const countryOptions = referenceData.countries ?? COUNTRIES
  const referenceDataAvailable = !referenceDataError && [
    referenceData.machineTypes,
    referenceData.environments,
    referenceData.deploymentStatuses,
    referenceData.automationLevels,
    referenceData.installationTypes,
    countryOptions,
  ].every((options) => options.length > 0)

  const showError = (field: keyof ContributionErrors) => {
    if (touched.has(field) || Object.keys(errors).length > 0) return validateContribution(values)[field]
    return undefined
  }

  const markChanged = (field: string) => {
    setTouched((current) => new Set(current).add(field))
    if (submitState === 'error') setSubmitState('idle')
    if (submitState !== 'submitting') setSubmitMessage('')
  }

  const updateTextField = (field: TextField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    markChanged(field)
  }

  const updateDisclosure = (accepted: boolean) => {
    setValues((current) => ({ ...current, disclosureAccepted: accepted }))
    markChanged('disclosureAccepted')
  }

  const updateEvidence = (index: number, value: string) => {
    setValues((current) => ({
      ...current,
      evidenceUrls: current.evidenceUrls.map((url, currentIndex) => currentIndex === index ? value : url),
    }))
    markChanged('evidenceUrls')
  }

  const addEvidence = () => setValues((current) => ({ ...current, evidenceUrls: [...current.evidenceUrls, ''] }))

  const removeEvidence = (index: number) => {
    setValues((current) => ({
      ...current,
      evidenceUrls: current.evidenceUrls.length === 1
        ? ['']
        : current.evidenceUrls.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateContribution(values)
    setErrors(nextErrors)
    setTouched(new Set(Object.keys(values)))

    if (hasContributionErrors(nextErrors)) {
      setSubmitState('idle')
      setSubmitMessage('Please correct the highlighted fields before submitting.')
      const firstInvalidField: Record<string, string> = {
        siteName: 'site-name',
        countryCode: 'country-code',
        latitude: 'latitude',
        longitude: 'longitude',
        machineType: 'machine-type',
        manufacturer: 'manufacturer',
        machineModel: 'machine-model',
        quantity: 'quantity',
        technologySupplier: 'technology-supplier',
        automationLevel: referenceData.automationLevels[0]
          ? `automation-level-${referenceData.automationLevels[0][0]}`
          : 'automation-level',
        commissioningDate: 'commissioning-date',
        evidenceUrls: 'evidence-0',
        email: 'email',
        disclosureAccepted: 'disclosure-accepted',
      }
      const firstInvalidId = Object.keys(nextErrors)
        .map((field) => firstInvalidField[field])
        .find(Boolean)
      if (nextErrors.email && !showMoreDetails) setShowMoreDetails(true)
      if (firstInvalidId) {
        window.setTimeout(() => document.getElementById(firstInvalidId)?.focus(), 0)
      }
      return
    }

    setSubmitState('submitting')
    setSubmitMessage('')
    try {
      const result = await submitContribution(values, resubmission ? { resubmissionOf: { id: resubmission.id, key: resubmission.key } } : undefined)
      if (resubmission && typeof result?.id === 'number') markResubmitted(resubmission.id, result.id)
      // This browser keeps the submission and its key, so the contributor can follow it without an account (FR-59)
      const followed = typeof result?.id === 'number' && typeof result.key === 'string'
      if (followed) {
        const machine = [values.manufacturer.trim(), values.machineModel.trim()].filter(Boolean).join(' ')
        add({
          id: result.id as number,
          key: result.key as string,
          siteName: values.siteName.trim(),
          machine: values.machineModel.trim() ? machine : `${machine} ${formatEnumLabel(values.machineType)}`.trim(),
          submittedAt: new Date().toISOString(),
        })
      }
      setTracked(followed ? { id: result.id as number, key: result.key as string } : null)
      setSubmitState('success')
      // Both are optional when submitting (FR-07) but needed for approval, so the contributor hears it now
      const missing = [
        ...(values.evidenceUrls.every((url) => !url.trim()) ? ['a source link'] : []),
        ...(!values.latitude.trim() || !values.longitude.trim() ? ["the site's coordinates, unless the site is already on the map"] : []),
      ]
      const reminder = missing.length > 0 ? ` Before it can be approved it needs ${missing.join(' and ')}; the reviewer may ask you for ${missing.length > 1 ? 'them' : 'it'}.` : ''
      setSubmitMessage(`${submissionMessage(result?.verificationStatus ?? 'pending_review', result?.id, followed)}${reminder}`)
    } catch (error) {
      setSubmitState('error')
      setSubmitMessage(error instanceof Error ? error.message : 'We could not submit your contribution. Please try again.')
    }
  }

  const resetForm = () => {
    // A resubmission ends here; the parent starts a fresh, blank form
    if (resubmission) {
      onClearResubmission()
      return
    }
    setValues({ ...EMPTY_CONTRIBUTION_FORM, evidenceUrls: [''] })
    setErrors({})
    setTouched(new Set())
    setSubmitState('idle')
    setSubmitMessage('')
    setShowMoreDetails(false)
  }

  if (submitState === 'success') {
    return (
      <section className="success-panel" role="status" aria-labelledby="contribution-success-heading">
        <span className="success-panel__icon" aria-hidden="true">✓</span>
        <div>
          <h2 id="contribution-success-heading">Contribution received</h2>
          <p>{submitMessage}</p>
          {tracked && (
            <div className="success-panel__link">
              <p>To follow it on another device, open its private tracking link there.</p>
              <CopyTrackingLink id={tracked.id} contributionKey={tracked.key} />
            </div>
          )}
          <div className="form-actions">
            {tracked && <button className="button button--primary" type="button" onClick={onShowMine}>See my contributions</button>}
            <button className="button button--secondary" type="button" onClick={resetForm}>Submit another contribution</button>
          </div>
        </div>
      </section>
    )
  }

  if (referenceDataIsLoading) {
    return (
      <StateMessage
        variant="loading"
        title="Loading reference data"
        message="The controlled values for this form are being loaded."
      />
    )
  }

  if (!referenceDataAvailable) {
    return (
      <StateMessage
        variant="error"
        title="Reference data unavailable"
        message="The controlled values needed for this form could not be loaded. Please try again later."
      />
    )
  }

  return (
    <>
      {resubmission && (
        <aside className="contribution-notice contribution-notice--resubmit" aria-labelledby="resubmission-heading">
          <h2 id="resubmission-heading">Resubmitting #{resubmission.id}</h2>
          <p>
            It was rejected{resubmission.reason ? <>: <q>{resubmission.reason}</q></> : '.'} The form starts from what you sent.
            Correct the details, then submit them as a new contribution; it stays linked to #{resubmission.id}, so the reviewer sees the earlier decision.
          </p>
          <button className="text-button text-button--flush" type="button" onClick={onClearResubmission}>Start from a blank form instead</button>
        </aside>
      )}
      <aside className="contribution-notice" aria-labelledby="contribution-notice-heading">
        <h2 id="contribution-notice-heading">Before you submit</h2>
        <p>Only submit information you are authorised to disclose. This register covers equipment with an automation technology fitted; standalone machines without one are outside this submission scope. A submission can be approved only once it has at least one source link and, for a site not yet on the map, its coordinates. Add them now if you can; otherwise the reviewer will ask for them under My contributions. Contributions are checked before they become part of the public market map.</p>
      </aside>

      <form className="contribution-form" noValidate onSubmit={handleSubmit}>
        <fieldset>
          <legend>Deployment details</legend>
          <div className="form-grid">
            <label className="form-field form-field--wide" htmlFor="site-name"><span className="form-label">Mine site name <span aria-hidden="true">*</span></span>
              <input id="site-name" name="siteName" value={values.siteName} onChange={(event) => updateTextField('siteName', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('siteName'))} aria-describedby={showError('siteName') ? 'site-name-error' : undefined} />
              <FieldError id="site-name-error" message={showError('siteName')} />
            </label>

            <label className="form-field" htmlFor="country-code"><span className="form-label">Country <span aria-hidden="true">*</span></span>
              <select id="country-code" name="countryCode" value={values.countryCode} onChange={(event) => updateTextField('countryCode', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('countryCode'))} aria-describedby={showError('countryCode') ? 'country-code-error' : undefined}>
                <option value="">Select a country</option>
                {countryOptions.map(([value, label]) => <option key={value} value={value}>{label} ({value})</option>)}
              </select>
              <FieldError id="country-code-error" message={showError('countryCode')} />
            </label>

            <div className="form-grid form-grid--coordinates form-field--wide">
              <label className="form-field" htmlFor="latitude"><span className="form-label">Site latitude <span className="form-help">(optional)</span></span>
                <input id="latitude" name="latitude" type="number" min="-90" max="90" step="any" inputMode="decimal" placeholder="e.g. -22.3" value={values.latitude} onChange={(event) => updateTextField('latitude', event.target.value)} aria-invalid={Boolean(showError('latitude'))} aria-describedby={showError('latitude') ? 'latitude-error' : undefined} />
                <FieldError id="latitude-error" message={showError('latitude')} />
              </label>

              <label className="form-field" htmlFor="longitude"><span className="form-label">Site longitude <span className="form-help">(optional)</span></span>
                <input id="longitude" name="longitude" type="number" min="-180" max="180" step="any" inputMode="decimal" placeholder="e.g. 118.7" value={values.longitude} onChange={(event) => updateTextField('longitude', event.target.value)} aria-invalid={Boolean(showError('longitude'))} aria-describedby={showError('longitude') ? 'longitude-error' : undefined} />
                <FieldError id="longitude-error" message={showError('longitude')} />
              </label>
            </div>

            <label className="form-field" htmlFor="machine-type"><span className="form-label">Machine type <span aria-hidden="true">*</span></span>
              <select id="machine-type" name="machineType" value={values.machineType} onChange={(event) => updateTextField('machineType', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('machineType'))} aria-describedby={showError('machineType') ? 'machine-type-error' : undefined}><option value="">Select a machine type</option>{referenceData.machineTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <FieldError id="machine-type-error" message={showError('machineType')} />
            </label>
            <label className="form-field" htmlFor="manufacturer"><span className="form-label">Machine manufacturer <span aria-hidden="true">*</span></span>
              <input id="manufacturer" name="manufacturer" placeholder="e.g. Caterpillar" value={values.manufacturer} onChange={(event) => updateTextField('manufacturer', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('manufacturer'))} aria-describedby={showError('manufacturer') ? 'manufacturer-error' : undefined} />
              <FieldError id="manufacturer-error" message={showError('manufacturer')} />
            </label>
            <label className="form-field" htmlFor="machine-model"><span className="form-label">Machine model <span aria-hidden="true">*</span></span>
              <input id="machine-model" name="machineModel" placeholder="e.g. 793F" value={values.machineModel} onChange={(event) => updateTextField('machineModel', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('machineModel'))} aria-describedby={showError('machineModel') ? 'machine-model-error' : undefined} />
              <FieldError id="machine-model-error" message={showError('machineModel')} />
            </label>
            <label className="form-field" htmlFor="quantity"><span className="form-label">Quantity <span aria-hidden="true">*</span></span>
              <input id="quantity" name="quantity" type="number" min="1" step="1" inputMode="numeric" placeholder="e.g. 10" value={values.quantity} onChange={(event) => updateTextField('quantity', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('quantity'))} aria-describedby={showError('quantity') ? 'quantity-error' : undefined} />
              <FieldError id="quantity-error" message={showError('quantity')} />
            </label>
            <label className="form-field" htmlFor="commissioning-date">Commissioning date or year
              <input id="commissioning-date" name="commissioningDate" placeholder="2025 or 2025-06-30" value={values.commissioningDate} onChange={(event) => updateTextField('commissioningDate', event.target.value)} aria-invalid={Boolean(showError('commissioningDate'))} aria-describedby={showError('commissioningDate') ? 'commissioning-date-error' : undefined} />
              <FieldError id="commissioning-date-error" message={showError('commissioningDate')} />
            </label>
          </div>
        </fieldset>

        <button
          className="text-button text-button--disclosure text-button--flush detail-toggle"
          type="button"
          aria-expanded={showMoreDetails}
          aria-controls="additional-contribution-details"
          onClick={() => setShowMoreDetails((current) => !current)}
        >
          <MapIcon name="chevronDown" size={16} /> {showMoreDetails ? 'Hide additional details' : 'Add more detail'}
        </button>

        {showMoreDetails && <fieldset id="additional-contribution-details">
          <legend>Additional details</legend>
          <div className="form-grid">
            <label className="form-field" htmlFor="region">State or region
              <input id="region" name="region" value={values.region} onChange={(event) => updateTextField('region', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="commodity">Commodity
              <input id="commodity" name="commodity" placeholder="e.g. Iron ore" value={values.commodity} onChange={(event) => updateTextField('commodity', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="machine-model-variant">Machine model variant
              <input id="machine-model-variant" name="machineModelVariant" placeholder="e.g. XDE" value={values.machineModelVariant} onChange={(event) => updateTextField('machineModelVariant', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="environment">Mining environment
              <select id="environment" name="environment" value={values.environment} onChange={(event) => updateTextField('environment', event.target.value)}><option value="">Select an environment</option>{referenceData.environments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="form-field" htmlFor="deployment-status">Deployment status
              <select id="deployment-status" name="deploymentStatus" value={values.deploymentStatus} onChange={(event) => updateTextField('deploymentStatus', event.target.value)}><option value="">Select a status</option>{referenceData.deploymentStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="form-field" htmlFor="installation-type">Installation type
              <select id="installation-type" name="installationType" value={values.installationType} onChange={(event) => updateTextField('installationType', event.target.value)}><option value="">Select an installation type</option>{referenceData.installationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
          </div>
        </fieldset>}

        <fieldset>
          <legend>Technology details</legend>
          <div className="form-grid">
            <label className="form-field" htmlFor="technology-supplier"><span className="form-label">Technology supplier <span aria-hidden="true">*</span></span>
              <input id="technology-supplier" name="technologySupplier" placeholder="e.g. ASI Mining" value={values.technologySupplier} onChange={(event) => updateTextField('technologySupplier', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('technologySupplier'))} aria-describedby={showError('technologySupplier') ? 'technology-supplier-error' : undefined} />
              <FieldError id="technology-supplier-error" message={showError('technologySupplier')} />
            </label>
            <label className="form-field" htmlFor="technology-product">Technology product
              <input id="technology-product" name="technologyProduct" placeholder="e.g. Command for hauling" value={values.technologyProduct} onChange={(event) => updateTextField('technologyProduct', event.target.value)} />
            </label>
            <fieldset className="chip-field form-field form-field--wide" id="automation-level" aria-invalid={Boolean(showError('automationLevel'))} aria-describedby={showError('automationLevel') ? 'automation-level-error' : undefined}>
              <legend>Automation level <span aria-hidden="true">*</span></legend>
              <div className="chip-group" role="radiogroup" aria-label="Automation level" aria-required="true" aria-invalid={Boolean(showError('automationLevel'))} aria-describedby={showError('automationLevel') ? 'automation-level-error' : undefined}>
                {referenceData.automationLevels.map(([value, label]) => (
                  <label className="choice-chip" key={value}>
                    <input id={`automation-level-${value}`} type="radio" name="automationLevel" value={value} checked={values.automationLevel === value} onChange={() => updateTextField('automationLevel', value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <FieldError id="automation-level-error" message={showError('automationLevel')} />
            </fieldset>
          </div>
        </fieldset>

        <fieldset>
          <legend>Evidence and contact</legend>
          <div className="evidence-list">
            <div>
              <p className="form-help">Add public sources that support this deployment, such as a company announcement or report.</p>
              {values.evidenceUrls.map((url, index) => <div className="evidence-row" key={`evidence-${index}`}>
                <label className="form-field" htmlFor={`evidence-${index}`}>Evidence URL {index + 1}
                  <input id={`evidence-${index}`} name="evidenceUrls" type="url" placeholder="https://example.com/source" value={url} onChange={(event) => updateEvidence(index, event.target.value)} aria-invalid={Boolean(showError('evidenceUrls'))} aria-describedby={showError('evidenceUrls') ? 'evidence-url-error' : undefined} />
                </label>
                <button className="button button--secondary" type="button" onClick={() => removeEvidence(index)} disabled={values.evidenceUrls.length === 1}>Remove</button>
              </div>)}
              <FieldError id="evidence-url-error" message={showError('evidenceUrls')} />
              <button className="button button--secondary evidence-add" type="button" onClick={addEvidence}>Add another source</button>
            </div>
            {showMoreDetails && <div className="form-grid">
              <label className="form-field" htmlFor="email">Contact email <span className="form-help">(optional)</span>
                <input id="email" name="email" type="email" placeholder="you@example.com" value={values.email} onChange={(event) => updateTextField('email', event.target.value)} aria-invalid={Boolean(showError('email'))} aria-describedby={showError('email') ? 'email-error' : undefined} />
                <FieldError id="email-error" message={showError('email')} />
              </label>
              <label className="form-field" htmlFor="organisation">Organisation <span className="form-help">(optional)</span>
                <input id="organisation" name="organisation" value={values.organisation} onChange={(event) => updateTextField('organisation', event.target.value)} />
              </label>
              <p className="form-help form-field--wide">Contact details are used only if the project team needs clarification. They are not published in the public register.</p>
            </div>}
            <label className={`disclosure-check ${showError('disclosureAccepted') ? 'disclosure-check--error' : ''}`} htmlFor="disclosure-accepted">
              <input id="disclosure-accepted" name="disclosureAccepted" type="checkbox" checked={values.disclosureAccepted} onChange={(event) => updateDisclosure(event.target.checked)} required aria-required="true" aria-invalid={Boolean(showError('disclosureAccepted'))} aria-describedby={showError('disclosureAccepted') ? 'disclosure-error' : undefined} />
              <span>I confirm that I am authorised to disclose this information and understand it may be published after verification. <span aria-hidden="true">*</span></span>
            </label>
            <FieldError id="disclosure-error" message={showError('disclosureAccepted')} />
          </div>
        </fieldset>

        <aside className="contribution-notice contribution-notice--next" aria-labelledby="contribution-next-heading">
          <h2 id="contribution-next-heading">What happens next</h2>
          <p>We review the submission and its sources before publishing it. Follow its review, and answer any request for changes, under My contributions in this browser; no account is needed. Contact details are used only for clarification and are not published.</p>
        </aside>

        {submitMessage && submitState === 'idle' && <p className="form-summary-error" role="alert">{submitMessage}</p>}
        {submitState === 'error' && <StateMessage variant="error" title="Submission failed" message={submitMessage} />}
        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={submitState === 'submitting'}>{submitState === 'submitting' ? 'Submitting…' : 'Submit deployment'}</button>
          {submitState === 'submitting' && <span className="form-help" role="status">Sending your contribution…</span>}
        </div>
      </form>
    </>
  )
}

type Tab = 'new' | 'mine'
const TABS: readonly [Tab, string][] = [['new', 'New contribution'], ['mine', 'My contributions']]

/** /contribute?tab=mine opens the list, for example from a link back to it */
function initialTab(): Tab {
  return new URLSearchParams(window.location.search).get('tab') === 'mine' ? 'mine' : 'new'
}

function ContributePage(props: ContributePageProps) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [resubmission, setResubmission] = useState<Resubmission | null>(null)
  const { items } = useMyContributions()
  // Counted by application, as the list shows them
  const applications = groupContributions(items).length

  async function startResubmission(item: TrackedContribution) {
    const contribution = await getOwnContribution(item.id, item.key)
    setResubmission({ id: item.id, key: item.key, reason: item.last?.decision?.note ?? null, values: formValuesFrom(contribution) })
    setTab('new')
    window.scrollTo({ top: 0 })
  }

  function select(next: Tab, focus = false) {
    setTab(next)
    if (focus) document.getElementById(`contribute-tab-${next}`)?.focus()
  }

  // Arrow keys move between the tabs, as the ARIA tabs pattern expects
  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const index = TABS.findIndex(([value]) => value === tab)
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? TABS.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
    select(TABS[next][0], true)
  }

  return (
    <section className="product-page contribute-page" aria-labelledby="contribute-heading">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Community data</p>
          <h1 id="contribute-heading">Contribute</h1>
        </div>
      </header>
      <div className="contribute-tabs" role="tablist" aria-label="Contribute" onKeyDown={moveFocus}>
        {TABS.map(([value, label]) => (
          <button
            key={value}
            id={`contribute-tab-${value}`}
            className="contribute-tabs__tab"
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`contribute-panel-${value}`}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => select(value)}
          >
            {label}
            {value === 'mine' && applications > 0 && <span className="contribute-tabs__count">{applications}</span>}
          </button>
        ))}
      </div>
      <div className="contribute-panel" id={`contribute-panel-${tab}`} role="tabpanel" aria-labelledby={`contribute-tab-${tab}`}>
        {tab === 'new'
          ? <NewContribution
              // A resubmission and a blank form are separate forms, each starting from its own values
              key={resubmission ? `resubmit-${resubmission.id}` : 'blank'}
              {...props}
              onShowMine={() => select('mine')}
              resubmission={resubmission}
              onClearResubmission={() => setResubmission(null)}
            />
          : <MyContributions onStartNew={() => select('new')} onResubmit={startResubmission} />}
      </div>
    </section>
  )
}

export default ContributePage
