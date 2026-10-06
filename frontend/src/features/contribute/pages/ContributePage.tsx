import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { postContribution } from '../../../lib/api/contributions'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import StateMessage from '../../../shared/components/StateMessage'
import {
  COUNTRIES,
  DEFAULT_CONTRIBUTION_REFERENCE_DATA,
  EMPTY_CONTRIBUTION_FORM,
  type ContributionErrors,
  type ContributionFormValues,
  type ContributionReferenceData,
  type ContributionVerificationStatus,
  type ContributionSubmitter,
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

function submissionMessage(status: ContributionVerificationStatus, id?: number): string {
  const reference = typeof id === 'number' ? ` Your submission reference is #${id}. Keep it if the team needs to follow up.` : ''
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

function ContributePage({
  submitContribution = postContribution,
  referenceData: providedReferenceData,
  referenceDataLoading = false,
  loadReferenceData = getContributionReferenceData,
}: ContributePageProps) {
  const [values, setValues] = useState<ContributionFormValues>({ ...EMPTY_CONTRIBUTION_FORM, evidenceUrls: [''] })
  const [errors, setErrors] = useState<ContributionErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [showMoreDetails, setShowMoreDetails] = useState(false)
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
        machineType: 'machine-type',
        manufacturer: 'manufacturer',
        quantity: 'quantity',
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
      const result = await submitContribution(values)
      setSubmitState('success')
      setSubmitMessage(submissionMessage(result?.verificationStatus ?? 'pending_review', result?.id))
    } catch (error) {
      setSubmitState('error')
      setSubmitMessage(error instanceof Error ? error.message : 'We could not submit your contribution. Please try again.')
    }
  }

  const resetForm = () => {
    setValues({ ...EMPTY_CONTRIBUTION_FORM, evidenceUrls: [''] })
    setErrors({})
    setTouched(new Set())
    setSubmitState('idle')
    setSubmitMessage('')
    setShowMoreDetails(false)
  }

  if (submitState === 'success') {
    return (
      <section className="product-page contribute-page" aria-labelledby="contribution-success-heading">
        <header className="page-heading">
          <div><p className="eyebrow">Community data</p><h1>Contribute</h1><p className="intro">Help improve the autonomous mining equipment dataset.</p></div>
        </header>
        <section className="success-panel" role="status">
          <span className="success-panel__icon" aria-hidden="true">✓</span>
          <div>
            <h2 id="contribution-success-heading">Contribution received</h2>
            <p>{submitMessage}</p>
            <button className="button button--secondary" type="button" onClick={resetForm}>Submit another contribution</button>
          </div>
        </section>
      </section>
    )
  }

  if (referenceDataIsLoading) {
    return (
      <section className="product-page contribute-page" aria-labelledby="contribute-heading">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Community data</p>
            <h1 id="contribute-heading">Contribute a deployment</h1>
            <p className="intro">Share a verified autonomous mining equipment deployment with the project team.</p>
          </div>
        </header>
        <StateMessage
          variant="loading"
          title="Loading reference data"
          message="The controlled values for this form are being loaded."
        />
      </section>
    )
  }

  if (!referenceDataAvailable) {
    return (
      <section className="product-page contribute-page" aria-labelledby="contribute-heading">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Community data</p>
            <h1 id="contribute-heading">Contribute a deployment</h1>
            <p className="intro">Share a verified autonomous mining equipment deployment with the project team.</p>
          </div>
        </header>
        <StateMessage
          variant="error"
          title="Reference data unavailable"
          message="The controlled values needed for this form could not be loaded. Please try again later."
        />
      </section>
    )
  }

  return (
    <section className="product-page contribute-page" aria-labelledby="contribute-heading">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Community data</p>
          <h1 id="contribute-heading">Contribute a deployment</h1>
          <p className="intro">Share a verified autonomous mining equipment deployment with the project team.</p>
        </div>
      </header>

      <aside className="contribution-notice" aria-labelledby="contribution-notice-heading">
        <h2 id="contribution-notice-heading">Before you submit</h2>
        <p>Only submit information you are authorised to disclose. This register covers equipment with an automation product fitted; standalone machines without one are outside this submission scope. Contributions are checked before they become part of the public market map.</p>
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

            <label className="form-field" htmlFor="machine-type"><span className="form-label">Machine type <span aria-hidden="true">*</span></span>
              <select id="machine-type" name="machineType" value={values.machineType} onChange={(event) => updateTextField('machineType', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('machineType'))} aria-describedby={showError('machineType') ? 'machine-type-error' : undefined}><option value="">Select a machine type</option>{referenceData.machineTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <FieldError id="machine-type-error" message={showError('machineType')} />
            </label>
            <label className="form-field" htmlFor="manufacturer"><span className="form-label">Machine manufacturer <span aria-hidden="true">*</span></span>
              <input id="manufacturer" name="manufacturer" placeholder="e.g. Caterpillar" value={values.manufacturer} onChange={(event) => updateTextField('manufacturer', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('manufacturer'))} aria-describedby={showError('manufacturer') ? 'manufacturer-error' : undefined} />
              <FieldError id="manufacturer-error" message={showError('manufacturer')} />
            </label>
            <label className="form-field" htmlFor="machine-model">Machine model
              <input id="machine-model" name="machineModel" placeholder="e.g. 793F" value={values.machineModel} onChange={(event) => updateTextField('machineModel', event.target.value)} />
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
          className="detail-toggle"
          type="button"
          aria-expanded={showMoreDetails}
          aria-controls="additional-contribution-details"
          onClick={() => setShowMoreDetails((current) => !current)}
        >
          {showMoreDetails ? 'Hide additional details' : 'Add more detail'}
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
            <label className="form-field" htmlFor="technology-supplier">Technology supplier
              <input id="technology-supplier" name="technologySupplier" placeholder="e.g. ASI Mining" value={values.technologySupplier} onChange={(event) => updateTextField('technologySupplier', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="technology-product">Technology product
              <input id="technology-product" name="technologyProduct" placeholder="e.g. Command for hauling" value={values.technologyProduct} onChange={(event) => updateTextField('technologyProduct', event.target.value)} />
            </label>
            <fieldset className="chip-field form-field form-field--wide">
              <legend>Automation level</legend>
              <div className="chip-group" role="radiogroup" aria-label="Automation level">
                <label className="choice-chip">
                  <input type="radio" name="automationLevel" value="" checked={values.automationLevel === ''} onChange={() => updateTextField('automationLevel', '')} />
                  <span>No automation level recorded</span>
                </label>
                {referenceData.automationLevels.map(([value, label]) => (
                  <label className="choice-chip" key={value}>
                    <input type="radio" name="automationLevel" value={value} checked={values.automationLevel === value} onChange={() => updateTextField('automationLevel', value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
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
              <button className="button button--secondary" type="button" onClick={addEvidence}>Add another source</button>
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
          <p>We review the submission and its sources before publishing it. Your submission reference appears on the confirmation screen. Contact details are used only for clarification and are not published.</p>
        </aside>

        {submitMessage && submitState === 'idle' && <p className="form-summary-error" role="alert">{submitMessage}</p>}
        {submitState === 'error' && <StateMessage variant="error" title="Submission failed" message={submitMessage} />}
        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={submitState === 'submitting'}>{submitState === 'submitting' ? 'Submitting…' : 'Submit deployment'}</button>
          {submitState === 'submitting' && <span className="form-help" role="status">Sending your contribution…</span>}
        </div>
      </form>
    </section>
  )
}

export default ContributePage
