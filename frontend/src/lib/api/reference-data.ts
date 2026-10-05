import { requestJson } from './http'
import { formatEnumLabel } from '../format'
import {
  COUNTRIES,
  type ContributionReferenceData,
  type ReferenceOption,
} from '../../features/contribute/types'

interface ReferenceDataResponseDto {
  machine_types: unknown
  automation_levels: unknown
  environments: unknown
  deployment_statuses: unknown
  installation_types: unknown
  countries?: unknown
}

function toOptions(value: unknown, fieldName: string): readonly ReferenceOption[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Invalid reference data: ${fieldName}`)
  }

  return value.map((item) => [item, formatEnumLabel(item)] as ReferenceOption)
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
    countries: response.countries === undefined ? COUNTRIES : toOptions(response.countries, 'countries'),
  }
}
