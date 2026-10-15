import type { ContributionErrors, ContributionFormValues } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/
const YEAR_OR_DATE_PATTERN = /^(\d{4}|\d{4}-\d{2}-\d{2})$/

function isValidYearOrDate(value: string): boolean {
  if (!YEAR_OR_DATE_PATTERN.test(value)) return false

  const year = Number(value.slice(0, 4))
  if (year < 1900 || year > 2100) return false

  if (/^\d{4}$/.test(value)) return true

  const [, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
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

  const latitude = values.latitude.trim()
  const longitude = values.longitude.trim()
  if (latitude || longitude) {
    if (!latitude || !longitude) {
      errors.latitude = 'Enter both latitude and longitude, or leave both blank.'
      errors.longitude = 'Enter both latitude and longitude, or leave both blank.'
    } else {
      if (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90) {
        errors.latitude = 'Latitude must be between -90 and 90.'
      }

      if (!Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180) {
        errors.longitude = 'Longitude must be between -180 and 180.'
      }
    }
  }

  if (!values.machineType) {
    errors.machineType = 'Machine type is required.'
  }

  if (!values.manufacturer.trim()) {
    errors.manufacturer = 'Machine manufacturer is required.'
  }

  if (!values.machineModel.trim()) {
    errors.machineModel = 'Machine model is required.'
  }

  if (!values.technologySupplier.trim()) {
    errors.technologySupplier = 'Technology supplier is required.'
  }

  if (!values.automationLevel) {
    errors.automationLevel = 'Automation level is required.'
  }

  if (
    !values.quantity.trim() ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 100_000
  ) {
    errors.quantity = 'Quantity must be a whole number between 1 and 100000.'
  }

  if (values.commissioningDate.trim() && !isValidYearOrDate(values.commissioningDate.trim())) {
    errors.commissioningDate = 'Enter a year between 1900 and 2100, or a valid date (YYYY-MM-DD) in that range.'
  }

  if (values.email.trim().length > 254) {
    errors.email = 'Email must be at most 254 characters.'
  } else if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address or leave this field blank.'
  }

  const nonEmptyEvidenceUrls = values.evidenceUrls
    .map((value) => value.trim())
    .filter(Boolean)
  if (nonEmptyEvidenceUrls.length > 10) {
    errors.evidenceUrls = 'Enter no more than 10 evidence URLs.'
  } else if (nonEmptyEvidenceUrls.some((value) => value.length > 2000)) {
    errors.evidenceUrls = 'Each evidence URL must be at most 2000 characters.'
  } else if (nonEmptyEvidenceUrls.some((value) => !isHttpUrl(value))) {
    errors.evidenceUrls = 'Evidence links must be valid HTTP or HTTPS URLs.'
  }

  // Match the backend's text field length limits.
  const textLimits = [
    { field: 'siteName', max: 200 },
    { field: 'region', max: 100 },
    { field: 'commodity', max: 100 },
    { field: 'manufacturer', max: 200 },
    { field: 'machineModel', max: 200 },
    { field: 'machineModelVariant', max: 100 },
    { field: 'technologySupplier', max: 200 },
    { field: 'technologyProduct', max: 200 },
    { field: 'organisation', max: 200 },
  ] as const

  for (const { field, max } of textLimits) {
    if (values[field].trim().length > max) {
      errors[field] = `Must be at most ${max} characters.`
    }
  }
  if (!values.disclosureAccepted) {
    errors.disclosureAccepted = 'Confirm that you are authorised to disclose this information.'
  }

  return errors
}

export function hasContributionErrors(errors: ContributionErrors): boolean {
  return Object.keys(errors).length > 0
}
