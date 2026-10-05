import type { MapResponseDto, MapResult, SiteDetail, SiteDetailDto } from './types'

export function mapMapResponse(dto: MapResponseDto): MapResult {
  return {
    excludedCount: dto.excluded_count,
    markers: dto.features.map(({ geometry, properties }) => ({
      id: properties.id,
      name: properties.name,
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
      countryCode: properties.country_code,
      region: properties.region,
      commodity: properties.commodity,
      status: properties.status,
      technologySuppliers: properties.technology_suppliers,
      machineCount: properties.machine_count,
      deploymentCount: properties.deployment_count,
    })),
  }
}

export function mapSiteDetail(dto: SiteDetailDto): SiteDetail {
  return {
    id: dto.id,
    name: dto.name,
    countryCode: dto.country_code,
    region: dto.region,
    commodity: dto.commodity,
    mineStatus: dto.mine_status,
    latitude: dto.latitude,
    longitude: dto.longitude,
    deployments: dto.deployments.map((deployment) => ({
      id: deployment.id,
      machineManufacturer: deployment.machine_manufacturer,
      machineModel: deployment.machine_model,
      machineType: deployment.machine_type,
      quantity: deployment.quantity,
      technologySupplier: deployment.technology_supplier,
      automationLevel: deployment.automation_level,
      environment: deployment.environment,
      status: deployment.status,
      commissioningDate: deployment.commissioning_date,
      commissioningYear: deployment.commissioning_year,
      validFrom: deployment.valid_from,
      validTo: deployment.valid_to,
    })),
  }
}
