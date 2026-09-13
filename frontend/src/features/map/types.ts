export type DeploymentStatus =
  | 'announced'
  | 'commissioning'
  | 'operational'
  | 'decommissioned'

export interface MapDeployment {
  id: string
  machineModel?: string
  machineType: string
  manufacturer: string
  supplier: string
  automationLevel: string
  environment: 'Surface' | 'Underground' | 'Both'
  status: DeploymentStatus
  quantity: number
  commissioningDate?: string
}

export interface MapSite {
  id: string
  name: string
  region: string
  country: string
  latitude: number
  longitude: number
  deployments: MapDeployment[]
}
