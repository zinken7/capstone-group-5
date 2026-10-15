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
  // History tables reject TRUNCATE; replica mode skips those triggers for this transaction only
  await query(`
    BEGIN;
    SET LOCAL session_replication_role = replica;
    TRUNCATE
      contribution_key, revision, verification_review, deployment_correction, evidence, admin_user, contributor,
      deployment, technology_product, machine_model, site_company_role, site, region, company
    RESTART IDENTITY CASCADE;
    COMMIT;
  `)
}

/**
 * Map fixtures: 3 sites, 4 deployments, ids match the former in-memory data for easy assertions.
 *
 * Deployment 12 is pending_review (for FR-43 filtering); deployment 14 is decommissioned but was in service 2015-03-01..2020-12-31 (for FR-11 date filtering). Each deployment carries its supplier and level (migration 005); 14's product is unclassified.
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
  // Verified deployments need evidence by commit time, so both inserts share one transaction
  await query(`
    BEGIN;
    INSERT INTO deployment (
      id, site_id, machine_model_id, technology_supplier_id, technology_product_id, quantity, environment,
      commissioning_date, commissioning_year, status, verification_status, valid_from, valid_to, automation_level
    ) VALUES
      (10, 1, 1, 1, 1, 96, 'surface', '2021-01-01', 2021, 'operational', 'verified', '2021-01-01', NULL, 'autonomous'),
      (11, 2, 2, 3, 2, 5, 'surface', NULL, NULL, 'commissioning', 'verified', '2023-06-01', NULL, 'teleremote'),
      (12, 3, 3, 2, 3, 8, 'underground', NULL, NULL, 'announced', 'pending_review', '2024-01-01', NULL, 'semi_autonomous'),
      (14, 1, 4, 1, 4, 20, 'surface', '2015-03-01', 2015, 'decommissioned', 'verified', '2015-03-01', '2020-12-31', 'operator_assistance');
    INSERT INTO evidence (deployment_id, url, source_type) VALUES
      (10, 'https://example.com/evidence/10', 'company_release'),
      (11, 'https://example.com/evidence/11', 'news'),
      (14, 'https://example.com/evidence/14', 'report');
    COMMIT;
  `)
  // Explicit ids do not advance identity sequences; move them past the seeded rows
  await query(`
    SELECT setval(pg_get_serial_sequence('company', 'id'), (SELECT MAX(id) FROM company));
    SELECT setval(pg_get_serial_sequence('region', 'id'), (SELECT MAX(id) FROM region));
    SELECT setval(pg_get_serial_sequence('site', 'id'), (SELECT MAX(id) FROM site));
    SELECT setval(pg_get_serial_sequence('machine_model', 'id'), (SELECT MAX(id) FROM machine_model));
    SELECT setval(pg_get_serial_sequence('technology_product', 'id'), (SELECT MAX(id) FROM technology_product));
    SELECT setval(pg_get_serial_sequence('deployment', 'id'), (SELECT MAX(id) FROM deployment));
  `)
}
