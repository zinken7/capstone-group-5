/** Mirrors the PostgreSQL enums in migrations 001/002; a test fails if they drift apart. */
export const MACHINE_TYPES = [
  'haul_truck', 'lhd', 'loader', 'dozer', 'excavator', 'drill',
  'scaler', 'shotcrete_machine', 'underground_haul_truck', 'water_truck',
  'wheel_loader', 'crawler_loader', 'rock_breaker', 'skid_steer',
  'strut_handler', 'shovel', 'other',
] as const

export const AUTOMATION_LEVELS = ['operator_assistance', 'teleremote', 'semi_autonomous', 'autonomous'] as const

export const MINING_ENVIRONMENTS = ['surface', 'underground', 'both'] as const

export const DEPLOYMENT_STATUSES = ['announced', 'commissioning', 'operational', 'decommissioned'] as const

export const INSTALLATION_TYPES = ['factory_installed', 'retrofit', 'unknown'] as const

/** PostgreSQL enum type name for each list above. */
export const ENUM_TYPES = {
  machine_type: MACHINE_TYPES,
  automation_level: AUTOMATION_LEVELS,
  mining_environment: MINING_ENVIRONMENTS,
  deployment_status: DEPLOYMENT_STATUSES,
  installation_type: INSTALLATION_TYPES,
} as const
