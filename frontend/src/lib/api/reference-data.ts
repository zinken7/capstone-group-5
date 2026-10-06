import { requestJson } from './http'
import { formatCountry, formatEnumLabel } from '../format'
import {
  COUNTRIES,
  type ContributionReferenceData,
  type ReferenceOption,
  type TechnologyProductReference,
} from '../../features/contribute/types'

interface ReferenceDataResponseDto {
  machine_types: unknown
  automation_levels: unknown
  environments: unknown
  deployment_statuses: unknown
  installation_types: unknown
  countries?: unknown
  technology_products?: unknown
}

function toOptions(value: unknown, fieldName: string): readonly ReferenceOption[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Invalid reference data: ${fieldName}`)
  }

  return value.map((item) => [item, formatEnumLabel(item)] as ReferenceOption)
}

function toCountryOptions(value: unknown): readonly ReferenceOption[] {
  return toOptions(value, 'countries').map(([code]) => [
    code,
    COUNTRIES.find(([countryCode]) => countryCode === code)?.[1] ?? formatCountry(code),
  ] as ReferenceOption)
}

function toTechnologyProducts(value: unknown): readonly TechnologyProductReference[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error('Invalid reference data: technology_products')

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) throw new Error(`Invalid reference data: technology_products[${index}]`)
    const supplier = 'supplier' in item && typeof item.supplier === 'string' ? item.supplier.trim() : ''
    const product = 'product' in item && typeof item.product === 'string' ? item.product.trim() : ''
    const automationLevel = 'automation_level' in item && (item.automation_level === null || typeof item.automation_level === 'string')
      ? item.automation_level
      : undefined
    if (!supplier || !product || automationLevel === undefined) throw new Error(`Invalid reference data: technology_products[${index}]`)
    return { supplier, product, automationLevel }
  })
}

/**
 * Load controlled values used by the contribution form.
 * The backend contract returns the enum values as snake_case string arrays.
 * Labels are derived locally for display, while the submitted values remain
 * exactly those supplied by the API.
 */
export async function getContributionReferenceData(): Promise<ContributionReferenceData> {
  const response = await requestJson<ReferenceDataResponseDto>('reference-data')

  return {
    machineTypes: toOptions(response.machine_types, 'machine_types'),
    environments: toOptions(response.environments, 'environments'),
    deploymentStatuses: toOptions(response.deployment_statuses, 'deployment_statuses'),
    automationLevels: toOptions(response.automation_levels, 'automation_levels'),
    installationTypes: toOptions(response.installation_types, 'installation_types'),
    countries: response.countries === undefined ? COUNTRIES : toCountryOptions(response.countries),
    technologyProducts: toTechnologyProducts(response.technology_products),
  }
}
