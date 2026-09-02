export type DeploymentStatus =
  | 'announced'
  | 'commissioning'
  | 'operational'
  | 'decommissioned'

export interface MapDeployment {
  id: string
  machineModel: string
  supplier: string
  status: DeploymentStatus
  quantity: number
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
