import { config } from '../config.js'
import { query } from '../database.js'
import { databaseNameOf, isTestDatabaseName } from './database-url.js'

/** Throws unless the connection string names a test database, so a reset can never hit development data. */
export function assertTestDatabase(connectionString: string): void {
  const name = databaseNameOf(connectionString)
  if (!isTestDatabaseName(name)) {
    throw new Error(
      `Refusing to reset database "${name}": test helpers only run against a database named "test" or ending in "_test"`,
    )
  }
}

/**
 * Truncate business tables and reset identities; call before each test case.
 */
export async function resetDatabase(): Promise<void> {
  assertTestDatabase(config.databaseUrl)
  await query(`
    TRUNCATE deployment, technology_product, machine_model, site_company_role, site, region, company
    RESTART IDENTITY CASCADE
  `)
}

/**
 * Map fixtures: 3 sites, 4 deployments, ids match the former in-memory data for easy assertions.
 *
 * Deployment 12 is pending_review (for FR-43 filtering); deployment 14 is decommissioned but was in service 2015-03-01..2020-12-31 (for FR-11 date filtering).
 */
export async function seedMapFixtures(): Promise<void> {
  await query(`
    INSERT INTO company (id, name, country_code) VALUES
      (1, 'Caterpillar', 'US'),
      (2, 'Sandvik', 'SE'),
      (3, 'RCT', 'AU')
  `)
  await query(`
    INSERT INTO region (id, name, country_code) VALUES
      (1, 'Pilbara', 'AU'),
      (2, 'Goldfields', 'AU')
  `)
  await query(`
    INSERT INTO site (id, name, country_code, region_id, commodity, mine_status, point_4326) VALUES
      (1, 'Roy Hill', 'AU', 1, 'iron_ore', 'operating', ST_SetSRID(ST_MakePoint(118.7, -22.3), 4326)),
      (2, 'Mount Whaleback', 'AU', 1, 'iron_ore', 'operating', ST_SetSRID(ST_MakePoint(119.66, -23.35), 4326)),
      (3, 'Kalgoorlie Super Pit', 'AU', 2, 'gold', 'operating', ST_SetSRID(ST_MakePoint(121.49, -30.75), 4326))
  `)
  await query(`
    INSERT INTO machine_model (id, manufacturer_id, model_name, machine_type) VALUES
      (1, 1, 'Caterpillar 793F', 'haul_truck'),
      (2, 2, NULL, 'drill'),
      (3, 2, 'Sandvik LH517i', 'lhd'),
      (4, 1, 'Caterpillar 777F', 'haul_truck')
  `)
  await query(`
    INSERT INTO technology_product (id, supplier_id, product_name, automation_level) VALUES
      (1, 1, 'Cat MineStar Command for hauling', 'autonomous'),
      (2, 3, 'RCT ControlMaster', 'teleremote'),
      (3, 2, 'Sandvik AutoMine', 'semi_autonomous'),
      (4, 1, 'Cat MineStar (unclassified)', NULL)
  `)
  await query(`
    INSERT INTO deployment (
      id, site_id, machine_model_id, technology_product_id, quantity, environment,
      commissioning_date, status, verification_status, valid_from, valid_to
    ) VALUES
      (10, 1, 1, 1, 96, 'surface', '2021-01-01', 'operational', 'verified', '2021-01-01', NULL),
      (11, 2, 2, 2, 5, 'surface', NULL, 'commissioning', 'verified', '2023-06-01', NULL),
      (12, 3, 3, 3, 8, 'underground', NULL, 'announced', 'pending_review', '2024-01-01', NULL),
      (14, 1, 4, 4, 20, 'surface', '2015-03-01', 'decommissioned', 'verified', '2015-03-01', '2020-12-31')
  `)
}
