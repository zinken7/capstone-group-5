export type DeploymentStatus = 'announced' | 'commissioning' | 'operational' | 'decommissioned'
export type MineStatus = 'operating' | 'commissioning'
export type MiningEnvironment = 'surface' | 'underground' | 'both'

export type BoundingBox = readonly [minLon: number, minLat: number, maxLon: number, maxLat: number]

export interface MapQuery {
  bbox?: BoundingBox
  supplier?: string
  /** YYYY-MM-DD */
  date?: string
  /** In service on 31 December of this year; use instead of date */
  year?: number
  /** With date or year, also keep sites whose deployments had ended */
  includeDecommissioned?: boolean
  country?: string
  region?: string
  machineType?: string
  automationLevel?: string
  commodity?: string
  environment?: MiningEnvironment
}

/** Wire types follow docs/api/README.md and the backend's snake_case fields. */
export interface MapFeatureDto {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [longitude: number, latitude: number]
  }
  properties: {
    id: number
    name: string
    country_code: string
    region: string | null
    commodity: string | null
    status: DeploymentStatus
    technology_suppliers: string[]
    machine_count: number
    deployment_count: number
  }
}

export interface MapResponseDto {
  type: 'FeatureCollection'
  excluded_count: number
  features: MapFeatureDto[]
}

export interface SiteDeploymentDto {
  id: number
  machine_manufacturer: string | null
  machine_model: string | null
  machine_type: string
  quantity: number
  technology_supplier: string
  automation_level: string | null
  environment: MiningEnvironment
  status: DeploymentStatus
  commissioning_date: string | null
  commissioning_year: number | null
  valid_from: string | null
  valid_to: string | null
}

export interface SiteDetailDto {
  id: number
  name: string
  country_code: string
  region: string | null
  commodity: string
  mine_status: MineStatus
  latitude: number
  longitude: number
  deployments: SiteDeploymentDto[]
}

/** Marker summaries do not contain the deployments available in site detail. */
export interface MapMarker {
  id: number
  name: string
  latitude: number
  longitude: number
  countryCode: string
  region: string | null
  commodity: string | null
  status: DeploymentStatus
  technologySuppliers: string[]
  /** Machines and deployments in the map's view: in service at the date or year when one is given */
  machineCount: number
  deploymentCount: number
}

export interface MapResult {
  excludedCount: number
  markers: MapMarker[]
}

export interface SiteDeployment {
  id: number
  machineManufacturer: string | null
  machineModel: string | null
  machineType: string
  quantity: number
  technologySupplier: string
  automationLevel: string | null
  environment: MiningEnvironment
  status: DeploymentStatus
  commissioningDate: string | null
  commissioningYear: number | null
  validFrom: string | null
  validTo: string | null
}

export interface SiteDetail {
  id: number
  name: string
  countryCode: string
  region: string | null
  commodity: string
  mineStatus: MineStatus
  latitude: number
  longitude: number
  deployments: SiteDeployment[]
}
