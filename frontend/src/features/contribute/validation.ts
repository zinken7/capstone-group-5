import type { ContributionErrors, ContributionFormValues } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/
const YEAR_OR_DATE_PATTERN = /^(\d{4}|\d{4}-\d{2}-\d{2})$/

function isValidYearOrDate(value: string): boolean {
  if (!YEAR_OR_DATE_PATTERN.test(value)) return false
  if (/^\d{4}$/.test(value)) return true

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateContribution(values: ContributionFormValues): ContributionErrors {
  const errors: ContributionErrors = {}
  const quantity = Number(values.quantity)

  if (!values.siteName.trim()) {
    errors.siteName = 'Mine site is required.'
  }

  if (!COUNTRY_CODE_PATTERN.test(values.countryCode.trim())) {
    errors.countryCode = 'Enter a two-letter country code, for example AU.'
  }

  if (!values.machineType) {
    errors.machineType = 'Machine type is required.'
  }

  if (!values.manufacturer.trim()) {
    errors.manufacturer = 'Machine manufacturer is required.'
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    errors.quantity = 'Quantity must be a positive whole number.'
  }

  if (values.commissioningDate.trim() && !isValidYearOrDate(values.commissioningDate.trim())) {
    errors.commissioningDate = 'Use a year (YYYY) or a full date (YYYY-MM-DD).'
  }

  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address or leave this field blank.'
  }

  const nonEmptyEvidenceUrls = values.evidenceUrls
    .map((value) => value.trim())
    .filter(Boolean)
  if (nonEmptyEvidenceUrls.some((value) => !isHttpUrl(value))) {
    errors.evidenceUrls = 'Evidence links must be valid HTTP or HTTPS URLs.'
  }

  if (!values.disclosureAccepted) {
    errors.disclosureAccepted = 'Confirm that you are authorised to disclose this information.'
  }

  return errors
}

export function hasContributionErrors(errors: ContributionErrors): boolean {
  return Object.keys(errors).length > 0
}
