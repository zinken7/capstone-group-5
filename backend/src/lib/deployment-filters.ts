/** Filters shared by the register, export and analytics endpoints; all match verified deployments only. */
export interface DeploymentFilters {
  q?: string
  siteId?: number
  country?: string
  region?: string
  commodity?: string
  supplier?: string
  manufacturer?: string
  machineType?: string
  automationLevel?: string
  environment?: string
  status?: string
  /** One deployment, for reading a single register row; never parsed from a request */
  deploymentId?: number
  /** First and last commissioning year, inclusive; undated deployments match neither */
  commissionedFrom?: number
  commissionedTo?: number
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

  // An exact site, for links from the map; must be a positive whole number
  const siteId = query.site_id
  if (siteId !== undefined) {
    const value = typeof siteId === 'string' ? siteId.trim() : null
    if (value === null || (value && !/^[1-9]\d*$/.test(value)) || !Number.isSafeInteger(Number(value))) {
      return { ok: false, error: 'invalid site_id parameter' }
    }
    if (value) filters.siteId = Number(value)
  }

  // A commissioning year range, each end a four-digit year
  for (const [param, key] of [['commissioned_from', 'commissionedFrom'], ['commissioned_to', 'commissionedTo']] as const) {
    const raw = query[param]
    if (raw === undefined) continue
    const value = typeof raw === 'string' ? raw.trim() : null
    if (value === null || (value && !/^\d{4}$/.test(value))) {
      return { ok: false, error: `invalid ${param} parameter` }
    }
    if (value) filters[key] = Number(value)
  }

  return { ok: true, value: filters }
}
