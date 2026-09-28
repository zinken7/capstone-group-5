import { useState } from 'react'
import type { FormEvent } from 'react'

import { postContribution } from '../../../lib/api/contributions'
import StateMessage from '../../../shared/components/StateMessage'
import {
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
}

function submissionMessage(status: ContributionVerificationStatus): string {
  if (status === 'verified') {
    return 'Your contribution has been received and marked as verified. It is now eligible for the public verified views.'
  }
  if (status === 'rejected') {
    return 'Your contribution was received but rejected during review, so it will not be published.'
  }
  if (status === 'unverified') {
    return 'Your contribution has been received as unverified. It remains hidden from the public verified views until review.'
  }
  return 'Your contribution has been received and is pending review. It will become part of the public verified views after review.'
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p className="form-error" id={id} role="alert">{message}</p>
}

function ContributePage({
  submitContribution = postContribution,
  referenceData = DEFAULT_CONTRIBUTION_REFERENCE_DATA,
  referenceDataLoading = false,
}: ContributePageProps) {
  const [values, setValues] = useState<ContributionFormValues>({ ...EMPTY_CONTRIBUTION_FORM, evidenceUrls: [''] })
  const [errors, setErrors] = useState<ContributionErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const referenceDataAvailable = Object.values(referenceData).every((options) => options.length > 0)

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
      return
    }

    setSubmitState('submitting')
    setSubmitMessage('')
    try {
      const result = await submitContribution(values)
      setSubmitState('success')
      setSubmitMessage(submissionMessage(result?.verificationStatus ?? 'pending_review'))
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

  if (referenceDataLoading) {
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
        <p>Only submit information you are authorised to disclose. Contributions are checked before they become part of the public market map.</p>
      </aside>

      <form className="contribution-form" noValidate onSubmit={handleSubmit}>
        <fieldset>
          <legend>Deployment details</legend>
          <div className="form-grid">
            <label className="form-field form-field--wide" htmlFor="site-name">Mine site name <span aria-hidden="true">*</span>
              <input id="site-name" name="siteName" value={values.siteName} onChange={(event) => updateTextField('siteName', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('siteName'))} aria-describedby={showError('siteName') ? 'site-name-error' : undefined} />
              <FieldError id="site-name-error" message={showError('siteName')} />
            </label>

            <label className="form-field" htmlFor="country-code">Country code <span aria-hidden="true">*</span>
              <input id="country-code" name="countryCode" maxLength={2} placeholder="AU" value={values.countryCode} onChange={(event) => updateTextField('countryCode', event.target.value.toUpperCase())} required aria-required="true" aria-invalid={Boolean(showError('countryCode'))} aria-describedby={showError('countryCode') ? 'country-code-error' : undefined} />
              <FieldError id="country-code-error" message={showError('countryCode')} />
            </label>

            <label className="form-field" htmlFor="region">State or region
              <input id="region" name="region" value={values.region} onChange={(event) => updateTextField('region', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="commodity">Commodity
              <input id="commodity" name="commodity" placeholder="Iron ore" value={values.commodity} onChange={(event) => updateTextField('commodity', event.target.value)} />
            </label>

            <label className="form-field" htmlFor="machine-type">Machine type <span aria-hidden="true">*</span>
              <select id="machine-type" name="machineType" value={values.machineType} onChange={(event) => updateTextField('machineType', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('machineType'))} aria-describedby={showError('machineType') ? 'machine-type-error' : undefined}><option value="">Select a machine type</option>{referenceData.machineTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <FieldError id="machine-type-error" message={showError('machineType')} />
            </label>
            <label className="form-field" htmlFor="manufacturer">Machine manufacturer <span aria-hidden="true">*</span>
              <input id="manufacturer" name="manufacturer" placeholder="Caterpillar" value={values.manufacturer} onChange={(event) => updateTextField('manufacturer', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('manufacturer'))} aria-describedby={showError('manufacturer') ? 'manufacturer-error' : undefined} />
              <FieldError id="manufacturer-error" message={showError('manufacturer')} />
            </label>
            <label className="form-field" htmlFor="machine-model">Machine model
              <input id="machine-model" name="machineModel" placeholder="793F" value={values.machineModel} onChange={(event) => updateTextField('machineModel', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="machine-model-variant">Machine model variant
              <input id="machine-model-variant" name="machineModelVariant" placeholder="Optional" value={values.machineModelVariant} onChange={(event) => updateTextField('machineModelVariant', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="quantity">Quantity <span aria-hidden="true">*</span>
              <input id="quantity" name="quantity" type="number" min="1" step="1" inputMode="numeric" value={values.quantity} onChange={(event) => updateTextField('quantity', event.target.value)} required aria-required="true" aria-invalid={Boolean(showError('quantity'))} aria-describedby={showError('quantity') ? 'quantity-error' : undefined} />
              <FieldError id="quantity-error" message={showError('quantity')} />
            </label>
            <label className="form-field" htmlFor="environment">Mining environment
              <select id="environment" name="environment" value={values.environment} onChange={(event) => updateTextField('environment', event.target.value)}><option value="">Select an environment</option>{referenceData.environments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="form-field" htmlFor="deployment-status">Deployment status
              <select id="deployment-status" name="deploymentStatus" value={values.deploymentStatus} onChange={(event) => updateTextField('deploymentStatus', event.target.value)}><option value="">Select a status</option>{referenceData.deploymentStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="form-field" htmlFor="commissioning-date">Commissioning date or year
              <input id="commissioning-date" name="commissioningDate" placeholder="2025 or 2025-06-30" value={values.commissioningDate} onChange={(event) => updateTextField('commissioningDate', event.target.value)} aria-invalid={Boolean(showError('commissioningDate'))} aria-describedby={showError('commissioningDate') ? 'commissioning-date-error' : undefined} />
              <FieldError id="commissioning-date-error" message={showError('commissioningDate')} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Technology details</legend>
          <div className="form-grid">
            <label className="form-field" htmlFor="technology-supplier">Technology supplier
              <input id="technology-supplier" name="technologySupplier" placeholder="Optional" value={values.technologySupplier} onChange={(event) => updateTextField('technologySupplier', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="technology-product">Technology product
              <input id="technology-product" name="technologyProduct" placeholder="Optional until verified" value={values.technologyProduct} onChange={(event) => updateTextField('technologyProduct', event.target.value)} />
            </label>
            <label className="form-field" htmlFor="automation-level">Automation level
              <select id="automation-level" name="automationLevel" value={values.automationLevel} onChange={(event) => updateTextField('automationLevel', event.target.value)}><option value="">Select an automation level</option>{referenceData.automationLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
            <label className="form-field" htmlFor="installation-type">Installation type
              <select id="installation-type" name="installationType" value={values.installationType} onChange={(event) => updateTextField('installationType', event.target.value)}><option value="">Select an installation type</option>{referenceData.installationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </label>
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
            <div className="form-grid">
              <label className="form-field" htmlFor="email">Contact email <span className="form-help">(optional)</span>
                <input id="email" name="email" type="email" placeholder="you@example.com" value={values.email} onChange={(event) => updateTextField('email', event.target.value)} aria-invalid={Boolean(showError('email'))} aria-describedby={showError('email') ? 'email-error' : undefined} />
                <FieldError id="email-error" message={showError('email')} />
              </label>
              <label className="form-field" htmlFor="organisation">Organisation <span className="form-help">(optional)</span>
                <input id="organisation" name="organisation" value={values.organisation} onChange={(event) => updateTextField('organisation', event.target.value)} />
              </label>
            </div>
            <label className={`disclosure-check ${showError('disclosureAccepted') ? 'disclosure-check--error' : ''}`} htmlFor="disclosure-accepted">
              <input id="disclosure-accepted" name="disclosureAccepted" type="checkbox" checked={values.disclosureAccepted} onChange={(event) => updateDisclosure(event.target.checked)} required aria-required="true" aria-invalid={Boolean(showError('disclosureAccepted'))} aria-describedby={showError('disclosureAccepted') ? 'disclosure-error' : undefined} />
              <span>I confirm that I am authorised to disclose this information and understand it may be published after verification. <span aria-hidden="true">*</span></span>
            </label>
            <FieldError id="disclosure-error" message={showError('disclosureAccepted')} />
          </div>
        </fieldset>

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
