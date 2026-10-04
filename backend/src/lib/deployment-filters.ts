/** Filters shared by the register, export and analytics endpoints; all match verified deployments only. */
export interface DeploymentFilters {
  q?: string
  country?: string
  region?: string
  commodity?: string
  supplier?: string
  manufacturer?: string
  machineType?: string
  automationLevel?: string
  environment?: string
  status?: string
}

const FILTER_PARAMS = {
  q: 'q',
  country: 'country',
  region: 'region',
  commodity: 'commodity',
  supplier: 'supplier',
  manufacturer: 'manufacturer',
  machine_type: 'machineType',
  automation_level: 'automationLevel',
  environment: 'environment',
  status: 'status',
} as const satisfies Record<string, keyof DeploymentFilters>

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** Blank values are treated as absent; a repeated parameter is rejected rather than silently ignored. */
export function parseDeploymentFilters(query: Record<string, unknown>): ParseResult<DeploymentFilters> {
  const filters: DeploymentFilters = {}

  for (const [param, key] of Object.entries(FILTER_PARAMS)) {
    const raw = query[param]
    if (raw === undefined) continue
    if (typeof raw !== 'string') {
      return { ok: false, error: `invalid ${param} parameter` }
    }
    const value = raw.trim()
    if (value) filters[key] = value
  }

  return { ok: true, value: filters }
}
