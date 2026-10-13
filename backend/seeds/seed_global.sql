\set ON_ERROR_STOP on
-- Synthetic development/test seed; no client data or real evidence.
-- Verification fixture distribution is configured in this SQL (133/67).
-- Requires PostgreSQL/PostGIS and migrations 001-005 (SRS v0.6).
-- installation_type is unknown: the workbook supplies no installation value.
-- commissioning_year is derived from the supplied full commissioning date.
-- Verification states are TEST FIXTURES, not real-world validation.
-- 133 verified / 67 unverified; verified fixtures have synthetic evidence URLs.
-- URLs use evidence.invalid and must never be presented as real source evidence.
-- No admin accounts or review decisions are fabricated.
-- Run with psql -X -v ON_ERROR_STOP=1 -d DATABASE -f seed_global.sql
-- Fixed IDs may conflict with an older seed: differing records abort, never overwrite.

BEGIN;
LOCK TABLE public.company, public.region, public.site, public.site_company_role, public.machine_model, public.technology_product, public.deployment, public.evidence IN SHARE ROW EXCLUSIVE MODE;

-- company: 25 records
CREATE TEMP TABLE seed_company ON COMMIT DROP AS
SELECT id, name, country_code, created_at FROM public.company WITH NO DATA;
INSERT INTO seed_company (id, name, country_code, created_at) VALUES
  (1, 'Arcstone Mining', 'AU', '2026-01-01 00:00:00+00'),
  (2, 'Blue Summit Resources', 'AU', '2026-01-01 00:00:00+00'),
  (3, 'Cedar Peak Minerals', 'AU', '2026-01-01 00:00:00+00'),
  (4, 'Dawnridge Metals', 'AU', '2026-01-01 00:00:00+00'),
  (5, 'Evercrest Mining', 'CA', '2026-01-01 00:00:00+00'),
  (6, 'Frontier Basin Resources', 'CA', '2026-01-01 00:00:00+00'),
  (7, 'Granite Horizon Mining', 'CA', '2026-01-01 00:00:00+00'),
  (8, 'Highland Vector Minerals', 'CA', '2026-01-01 00:00:00+00'),
  (9, 'Ironvale Resources', 'CL', '2026-01-01 00:00:00+00'),
  (10, 'Juniper Earthworks', 'CL', '2026-01-01 00:00:00+00'),
  (11, 'Keystone Ore Group', 'CL', '2026-01-01 00:00:00+00'),
  (12, 'Lumina Mining', 'CL', '2026-01-01 00:00:00+00'),
  (101, 'AtlasForge Equipment', 'AU', '2026-01-01 00:00:00+00'),
  (102, 'IronMotive Industries', 'CA', '2026-01-01 00:00:00+00'),
  (103, 'DeepCore Machines', 'SE', '2026-01-01 00:00:00+00'),
  (104, 'TerraWorks Equipment', 'FI', '2026-01-01 00:00:00+00'),
  (105, 'RockField Engineering', 'US', '2026-01-01 00:00:00+00'),
  (106, 'Apex Earthmoving', 'ZA', '2026-01-01 00:00:00+00'),
  (107, 'NordHaul Systems', 'BR', '2026-01-01 00:00:00+00'),
  (108, 'Cobalt Machines', 'ID', '2026-01-01 00:00:00+00'),
  (201, 'ZZH Autonomous Systems', 'AU', '2026-01-01 00:00:00+00'),
  (202, 'ZR Mining Technology', 'CA', '2026-01-01 00:00:00+00'),
  (203, 'HPL Automation', 'SE', '2026-01-01 00:00:00+00'),
  (204, 'Northstar Robotics', 'US', '2026-01-01 00:00:00+00'),
  (205, 'TerraPilot Systems', 'FI', '2026-01-01 00:00:00+00');
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.company actual JOIN seed_company expected USING (id)
    WHERE ROW(actual.id, actual.name, actual.country_code, actual.created_at) IS DISTINCT FROM ROW(expected.id, expected.name, expected.country_code, expected.created_at)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in company: existing ID has different content. Transaction aborted.';
  END IF;
END $$;
INSERT INTO public.company (id, name, country_code, created_at)
SELECT id, name, country_code, created_at FROM seed_company
ON CONFLICT (id) DO NOTHING;

-- region: 40 records
CREATE TEMP TABLE seed_region ON COMMIT DROP AS
SELECT id, name, country_code FROM public.region WITH NO DATA;
INSERT INTO seed_region (id, name, country_code) VALUES
  (5001, 'Western Australia', 'AU'),
  (5002, 'Queensland', 'AU'),
  (5003, 'New South Wales', 'AU'),
  (5004, 'South Australia', 'AU'),
  (5005, 'British Columbia', 'CA'),
  (5006, 'Ontario', 'CA'),
  (5007, 'Quebec', 'CA'),
  (5008, 'Saskatchewan', 'CA'),
  (5009, 'Atacama', 'CL'),
  (5010, 'Antofagasta', 'CL'),
  (5011, 'Coquimbo', 'CL'),
  (5012, 'Tarapaca', 'CL'),
  (5013, 'Arequipa', 'PE'),
  (5014, 'Cajamarca', 'PE'),
  (5015, 'Moquegua', 'PE'),
  (5016, 'Apurimac', 'PE'),
  (5017, 'Norrbotten', 'SE'),
  (5018, 'Vasterbotten', 'SE'),
  (5019, 'Dalarna', 'SE'),
  (5020, 'Gavleborg', 'SE'),
  (5021, 'Lapland', 'FI'),
  (5022, 'Kainuu', 'FI'),
  (5023, 'North Ostrobothnia', 'FI'),
  (5024, 'Central Finland', 'FI'),
  (5025, 'Limpopo', 'ZA'),
  (5026, 'Northern Cape', 'ZA'),
  (5027, 'North West', 'ZA'),
  (5028, 'Mpumalanga', 'ZA'),
  (5029, 'Nevada', 'US'),
  (5030, 'Arizona', 'US'),
  (5031, 'Wyoming', 'US'),
  (5032, 'Minnesota', 'US'),
  (5033, 'Minas Gerais', 'BR'),
  (5034, 'Para', 'BR'),
  (5035, 'Goias', 'BR'),
  (5036, 'Bahia', 'BR'),
  (5037, 'East Kalimantan', 'ID'),
  (5038, 'South Kalimantan', 'ID'),
  (5039, 'Papua', 'ID'),
  (5040, 'Sulawesi', 'ID');
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.region actual JOIN seed_region expected USING (id)
    WHERE ROW(actual.id, actual.name, actual.country_code) IS DISTINCT FROM ROW(expected.id, expected.name, expected.country_code)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in region: existing ID has different content. Transaction aborted.';
  END IF;
END $$;
INSERT INTO public.region (id, name, country_code)
SELECT id, name, country_code FROM seed_region
ON CONFLICT (id) DO NOTHING;

-- site: 40 records
CREATE TEMP TABLE seed_site ON COMMIT DROP AS
SELECT id, name, country_code, region_id, commodity, mine_status, point_4326 FROM public.site WITH NO DATA;
INSERT INTO seed_site (id, name, country_code, region_id, commodity, mine_status, point_4326) VALUES
  (10001, 'Aurora Mine', 'AU', 5001, 'copper', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(121.27000 -25.36500)')),
  (10002, 'Blackwood Mine', 'AU', 5002, 'gold', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(145.10000 -22.65500)')),
  (10003, 'Copperwind Mine', 'AU', 5003, 'iron_ore', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(147.13000 -32.14500)')),
  (10004, 'Dunestone Mine', 'AU', 5004, 'nickel', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(135.67000 -29.93500)')),
  (10005, 'Ember Ridge Mine', 'CA', 5005, 'zinc', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(-124.80000 54.03500)')),
  (10006, 'Falcon Crest Mine', 'CA', 5006, 'lithium', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-84.57000 50.04500)')),
  (10007, 'Granite Hollow Mine', 'CA', 5007, 'potash', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-71.73000 52.05500)')),
  (10008, 'Highland Star Mine', 'CA', 5008, 'bauxite', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-106.10000 52.36500)')),
  (10009, 'Iron Lantern Mine', 'CL', 5009, 'copper', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-69.27000 -27.36500)')),
  (10010, 'Juniper Vale Mine', 'CL', 5010, 'gold', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(-69.33000 -23.65500)')),
  (10011, 'Kingfisher Mine', 'CL', 5011, 'iron_ore', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-71.00000 -30.24500)')),
  (10012, 'Longreach Mine', 'CL', 5012, 'nickel', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-68.97000 -20.13500)')),
  (10013, 'Moonstone Mine', 'PE', 5013, 'zinc', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-72.23000 -16.36500)')),
  (10014, 'North Ember Mine', 'PE', 5014, 'lithium', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-78.40000 -7.15500)')),
  (10015, 'Opal Ridge Mine', 'PE', 5015, 'potash', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(-70.57000 -17.04500)')),
  (10016, 'Pine Horizon Mine', 'PE', 5016, 'bauxite', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-73.23000 -13.83500)')),
  (10017, 'Quartz Run Mine', 'SE', 5017, 'copper', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(20.40000 66.93500)')),
  (10018, 'Red Mesa Mine', 'SE', 5018, 'gold', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(18.53000 65.04500)')),
  (10019, 'Silver Basin Mine', 'SE', 5019, 'iron_ore', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(15.07000 61.15500)')),
  (10020, 'Timberline Mine', 'SE', 5020, 'nickel', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(16.50000 61.76500)')),
  (10021, 'Umber Peak Mine', 'FI', 5021, 'zinc', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(26.33000 67.03500)')),
  (10022, 'Valley Forge Mine', 'FI', 5022, 'lithium', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(27.97000 64.44500)')),
  (10023, 'Westhaven Mine', 'FI', 5023, 'potash', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(26.10000 65.15500)')),
  (10024, 'Yellowcrest Mine', 'FI', 5024, 'bauxite', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(25.73000 62.36500)')),
  (10025, 'Zephyr Ridge Mine', 'ZA', 5025, 'copper', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(28.97000 -23.66500)')),
  (10026, 'Ashgrove Mine', 'ZA', 5026, 'gold', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(22.30000 -29.25500)')),
  (10027, 'Brightwater Mine', 'ZA', 5027, 'iron_ore', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(25.33000 -26.24500)')),
  (10028, 'Cobalt Hill Mine', 'ZA', 5028, 'nickel', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(30.07000 -25.43500)')),
  (10029, 'Driftwood Mine', 'US', 5029, 'zinc', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-117.00000 38.93500)')),
  (10030, 'East Meridian Mine', 'US', 5030, 'lithium', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(-111.17000 34.04500)')),
  (10031, 'Foxglove Mine', 'US', 5031, 'potash', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-107.43000 43.05500)')),
  (10032, 'Goldfern Mine', 'US', 5032, 'bauxite', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-94.20000 47.16500)')),
  (10033, 'Harborstone Mine', 'BR', 5033, 'copper', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-43.97000 -19.36500)')),
  (10034, 'Indigo Rise Mine', 'BR', 5034, 'gold', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-52.33000 -5.15500)')),
  (10035, 'Jasper Plain Mine', 'BR', 5035, 'iron_ore', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(-49.20000 -15.94500)')),
  (10036, 'Kestrel Point Mine', 'BR', 5036, 'nickel', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(-42.07000 -12.13500)')),
  (10037, 'Lake Ember Mine', 'ID', 5037, 'zinc', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(116.37000 0.33500)')),
  (10038, 'Mistral Ridge Mine', 'ID', 5038, 'lithium', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(115.20000 -3.15500)')),
  (10039, 'New Dawn Mine', 'ID', 5039, 'potash', 'operating', ST_GeomFromEWKT('SRID=4326;POINT(138.13000 -4.04500)')),
  (10040, 'Orchid Valley Mine', 'ID', 5040, 'bauxite', 'commissioning', ST_GeomFromEWKT('SRID=4326;POINT(120.87000 -1.83500)'));
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.site actual JOIN seed_site expected USING (id)
    WHERE ROW(actual.id, actual.name, actual.country_code, actual.region_id, actual.commodity, actual.mine_status, actual.point_4326) IS DISTINCT FROM ROW(expected.id, expected.name, expected.country_code, expected.region_id, expected.commodity, expected.mine_status, expected.point_4326)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in site: existing ID has different content. Transaction aborted.';
  END IF;
END $$;
INSERT INTO public.site (id, name, country_code, region_id, commodity, mine_status, point_4326)
SELECT id, name, country_code, region_id, commodity, mine_status, point_4326 FROM seed_site
ON CONFLICT (id) DO NOTHING;

-- site_company_role: 40 records
CREATE TEMP TABLE seed_site_company_role ON COMMIT DROP AS
SELECT id, site_id, company_id, role FROM public.site_company_role WITH NO DATA;
INSERT INTO seed_site_company_role (id, site_id, company_id, role) VALUES
  (6001, 10001, 1, 'owner'),
  (6002, 10002, 2, 'owner'),
  (6003, 10003, 3, 'owner'),
  (6004, 10004, 4, 'owner'),
  (6005, 10005, 5, 'owner'),
  (6006, 10006, 6, 'owner'),
  (6007, 10007, 7, 'owner'),
  (6008, 10008, 8, 'owner'),
  (6009, 10009, 9, 'owner'),
  (6010, 10010, 10, 'owner'),
  (6011, 10011, 11, 'owner'),
  (6012, 10012, 12, 'owner'),
  (6013, 10013, 1, 'owner'),
  (6014, 10014, 2, 'owner'),
  (6015, 10015, 3, 'owner'),
  (6016, 10016, 4, 'owner'),
  (6017, 10017, 5, 'owner'),
  (6018, 10018, 6, 'owner'),
  (6019, 10019, 7, 'owner'),
  (6020, 10020, 8, 'owner'),
  (6021, 10021, 9, 'owner'),
  (6022, 10022, 10, 'owner'),
  (6023, 10023, 11, 'owner'),
  (6024, 10024, 12, 'owner'),
  (6025, 10025, 1, 'owner'),
  (6026, 10026, 2, 'owner'),
  (6027, 10027, 3, 'owner'),
  (6028, 10028, 4, 'owner'),
  (6029, 10029, 5, 'owner'),
  (6030, 10030, 6, 'owner'),
  (6031, 10031, 7, 'owner'),
  (6032, 10032, 8, 'owner'),
  (6033, 10033, 9, 'owner'),
  (6034, 10034, 10, 'owner'),
  (6035, 10035, 11, 'owner'),
  (6036, 10036, 12, 'owner'),
  (6037, 10037, 1, 'owner'),
  (6038, 10038, 2, 'owner'),
  (6039, 10039, 3, 'owner'),
  (6040, 10040, 4, 'owner');
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.site_company_role actual JOIN seed_site_company_role expected USING (id)
    WHERE ROW(actual.id, actual.site_id, actual.company_id, actual.role) IS DISTINCT FROM ROW(expected.id, expected.site_id, expected.company_id, expected.role)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in site_company_role: existing ID has different content. Transaction aborted.';
  END IF;
END $$;
INSERT INTO public.site_company_role (id, site_id, company_id, role)
SELECT id, site_id, company_id, role FROM seed_site_company_role
ON CONFLICT (id) DO NOTHING;

-- machine_model: 100 records
CREATE TEMP TABLE seed_machine_model ON COMMIT DROP AS
SELECT id, manufacturer_id, model_name, model_variant, machine_type, size_class, max_payload_tonnes, operating_weight_tonnes FROM public.machine_model WITH NO DATA;
INSERT INTO seed_machine_model (id, manufacturer_id, model_name, model_variant, machine_type, size_class, max_payload_tonnes, operating_weight_tonnes) VALUES
  (1001, 101, 'AF-H90', 'base', 'haul_truck', 'large', 180, 240),
  (1002, 101, 'AF-L18', 'Pro', 'lhd', 'medium', 18, 55),
  (1003, 101, 'AF-D7', 'XR', 'dozer', 'large', NULL, 70),
  (1004, 102, 'IM-UT60', 'Electric', 'underground_haul_truck', 'large', 60, 90),
  (1005, 102, 'IM-WT40', 'Plus', 'water_truck', 'large', 50, 80),
  (1006, 102, 'IM-UT60', 'Pro', 'underground_haul_truck', 'large', 60, 90),
  (1007, 102, 'IM-WT40', 'XR', 'water_truck', 'large', 50, 80),
  (1008, 102, 'IM-WL12', 'Electric', 'wheel_loader', 'medium', 20, 50),
  (1009, 103, 'DC-DR2', 'Plus', 'drill', 'medium', NULL, 35),
  (1010, 103, 'DC-SC5', 'base', 'scaler', 'medium', NULL, 30),
  (1011, 103, 'DC-DR2', 'XR', 'drill', 'medium', NULL, 35),
  (1012, 103, 'DC-SC5', 'Electric', 'scaler', 'medium', NULL, 30),
  (1013, 103, 'DC-SM4', 'Plus', 'shotcrete_machine', 'medium', NULL, 40),
  (1014, 104, 'TW-EX8', 'base', 'excavator', 'large', NULL, 95),
  (1015, 104, 'TW-LD6', 'Pro', 'loader', 'medium', 15, 45),
  (1016, 104, 'TW-EX8', 'Electric', 'excavator', 'large', NULL, 95),
  (1017, 104, 'TW-LD6', 'Plus', 'loader', 'medium', 15, 45),
  (1018, 104, 'TW-CL3', 'base', 'crawler_loader', 'medium', 12, 40),
  (1019, 105, 'RF-RB2', 'Pro', 'rock_breaker', 'small', NULL, 20),
  (1020, 105, 'RF-SS1', 'XR', 'skid_steer', 'small', 5, 8),
  (1021, 105, 'RF-RB2', 'Plus', 'rock_breaker', 'small', NULL, 20),
  (1022, 105, 'RF-SS1', 'base', 'skid_steer', 'small', 5, 8),
  (1023, 105, 'RF-SH9', 'Pro', 'strut_handler', 'medium', 12, 30),
  (1024, 106, 'AE-SV20', 'XR', 'shovel', 'large', 100, 180),
  (1025, 107, 'NH-120', 'Electric', 'haul_truck', 'large', 180, 240),
  (1026, 106, 'AE-SV20', 'base', 'shovel', 'large', 100, 180),
  (1027, 107, 'NH-120', 'Pro', 'haul_truck', 'large', 180, 240),
  (1028, 108, 'CM-LHD7', 'XR', 'lhd', 'medium', 18, 55),
  (1029, 108, 'CM-ROC1', 'Electric', 'other', 'medium', NULL, 25),
  (1030, 106, 'AE-EX14', 'Plus', 'excavator', 'large', NULL, 95),
  (1031, 108, 'CM-ROC1', 'Pro', 'other', 'medium', NULL, 25),
  (1032, 106, 'AE-EX14', 'XR', 'excavator', 'large', NULL, 95),
  (1033, 101, 'AF-H90', 'Electric', 'haul_truck', 'large', 180, 240),
  (1034, 101, 'AF-L18', 'Plus', 'lhd', 'medium', 18, 55),
  (1035, 101, 'AF-D7', 'base', 'dozer', 'large', NULL, 70),
  (1036, 101, 'AF-L18', 'XR', 'lhd', 'medium', 18, 55),
  (1037, 101, 'AF-D7', 'Electric', 'dozer', 'large', NULL, 70),
  (1038, 102, 'IM-UT60', 'Plus', 'underground_haul_truck', 'large', 60, 90),
  (1039, 102, 'IM-WT40', 'base', 'water_truck', 'large', 50, 80),
  (1040, 102, 'IM-WL12', 'Pro', 'wheel_loader', 'medium', 20, 50),
  (1041, 102, 'IM-WT40', 'Electric', 'water_truck', 'large', 50, 80),
  (1042, 102, 'IM-WL12', 'Plus', 'wheel_loader', 'medium', 20, 50),
  (1043, 103, 'DC-DR2', 'base', 'drill', 'medium', NULL, 35),
  (1044, 103, 'DC-SC5', 'Pro', 'scaler', 'medium', NULL, 30),
  (1045, 103, 'DC-SM4', 'XR', 'shotcrete_machine', 'medium', NULL, 40),
  (1046, 103, 'DC-SC5', 'Plus', 'scaler', 'medium', NULL, 30),
  (1047, 103, 'DC-SM4', 'base', 'shotcrete_machine', 'medium', NULL, 40),
  (1048, 104, 'TW-EX8', 'Pro', 'excavator', 'large', NULL, 95),
  (1049, 104, 'TW-LD6', 'XR', 'loader', 'medium', 15, 45),
  (1050, 104, 'TW-CL3', 'Electric', 'crawler_loader', 'medium', 12, 40),
  (1051, 104, 'TW-LD6', 'base', 'loader', 'medium', 15, 45),
  (1052, 104, 'TW-CL3', 'Pro', 'crawler_loader', 'medium', 12, 40),
  (1053, 105, 'RF-RB2', 'XR', 'rock_breaker', 'small', NULL, 20),
  (1054, 105, 'RF-SS1', 'Electric', 'skid_steer', 'small', 5, 8),
  (1055, 105, 'RF-SH9', 'Plus', 'strut_handler', 'medium', 12, 30),
  (1056, 105, 'RF-SS1', 'Pro', 'skid_steer', 'small', 5, 8),
  (1057, 105, 'RF-SH9', 'XR', 'strut_handler', 'medium', 12, 30),
  (1058, 106, 'AE-SV20', 'Electric', 'shovel', 'large', 100, 180),
  (1059, 107, 'NH-120', 'Plus', 'haul_truck', 'large', 180, 240),
  (1060, 108, 'CM-LHD7', 'base', 'lhd', 'medium', 18, 55),
  (1061, 107, 'NH-120', 'XR', 'haul_truck', 'large', 180, 240),
  (1062, 108, 'CM-LHD7', 'Electric', 'lhd', 'medium', 18, 55),
  (1063, 108, 'CM-ROC1', 'Plus', 'other', 'medium', NULL, 25),
  (1064, 106, 'AE-EX14', 'base', 'excavator', 'large', NULL, 95),
  (1065, 101, 'AF-H90', 'Pro', 'haul_truck', 'large', 180, 240),
  (1066, 106, 'AE-EX14', 'Electric', 'excavator', 'large', NULL, 95),
  (1067, 101, 'AF-H90', 'Plus', 'haul_truck', 'large', 180, 240),
  (1068, 101, 'AF-L18', 'base', 'lhd', 'medium', 18, 55),
  (1069, 101, 'AF-D7', 'Pro', 'dozer', 'large', NULL, 70),
  (1070, 102, 'IM-UT60', 'XR', 'underground_haul_truck', 'large', 60, 90),
  (1071, 101, 'AF-D7', 'Plus', 'dozer', 'large', NULL, 70),
  (1072, 102, 'IM-UT60', 'base', 'underground_haul_truck', 'large', 60, 90),
  (1073, 102, 'IM-WT40', 'Pro', 'water_truck', 'large', 50, 80),
  (1074, 102, 'IM-WL12', 'XR', 'wheel_loader', 'medium', 20, 50),
  (1075, 103, 'DC-DR2', 'Electric', 'drill', 'medium', NULL, 35),
  (1076, 102, 'IM-WL12', 'base', 'wheel_loader', 'medium', 20, 50),
  (1077, 103, 'DC-DR2', 'Pro', 'drill', 'medium', NULL, 35),
  (1078, 103, 'DC-SC5', 'XR', 'scaler', 'medium', NULL, 30),
  (1079, 103, 'DC-SM4', 'Electric', 'shotcrete_machine', 'medium', NULL, 40),
  (1080, 104, 'TW-EX8', 'Plus', 'excavator', 'large', NULL, 95),
  (1081, 103, 'DC-SM4', 'Pro', 'shotcrete_machine', 'medium', NULL, 40),
  (1082, 104, 'TW-EX8', 'XR', 'excavator', 'large', NULL, 95),
  (1083, 104, 'TW-LD6', 'Electric', 'loader', 'medium', 15, 45),
  (1084, 104, 'TW-CL3', 'Plus', 'crawler_loader', 'medium', 12, 40),
  (1085, 105, 'RF-RB2', 'base', 'rock_breaker', 'small', NULL, 20),
  (1086, 104, 'TW-CL3', 'XR', 'crawler_loader', 'medium', 12, 40),
  (1087, 105, 'RF-RB2', 'Electric', 'rock_breaker', 'small', NULL, 20),
  (1088, 105, 'RF-SS1', 'Plus', 'skid_steer', 'small', 5, 8),
  (1089, 105, 'RF-SH9', 'base', 'strut_handler', 'medium', 12, 30),
  (1090, 106, 'AE-SV20', 'Pro', 'shovel', 'large', 100, 180),
  (1091, 105, 'RF-SH9', 'Electric', 'strut_handler', 'medium', 12, 30),
  (1092, 106, 'AE-SV20', 'Plus', 'shovel', 'large', 100, 180),
  (1093, 107, 'NH-120', 'base', 'haul_truck', 'large', 180, 240),
  (1094, 108, 'CM-LHD7', 'Pro', 'lhd', 'medium', 18, 55),
  (1095, 108, 'CM-ROC1', 'XR', 'other', 'medium', NULL, 25),
  (1096, 108, 'CM-LHD7', 'Plus', 'lhd', 'medium', 18, 55),
  (1097, 108, 'CM-ROC1', 'base', 'other', 'medium', NULL, 25),
  (1098, 106, 'AE-EX14', 'Pro', 'excavator', 'large', NULL, 95),
  (1099, 101, 'AF-H90', 'XR', 'haul_truck', 'large', 180, 240),
  (1100, 101, 'AF-L18', 'Electric', 'lhd', 'medium', 18, 55);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.machine_model actual JOIN seed_machine_model expected USING (id)
    WHERE ROW(actual.id, actual.manufacturer_id, actual.model_name, actual.model_variant, actual.machine_type, actual.size_class, actual.max_payload_tonnes, actual.operating_weight_tonnes) IS DISTINCT FROM ROW(expected.id, expected.manufacturer_id, expected.model_name, expected.model_variant, expected.machine_type, expected.size_class, expected.max_payload_tonnes, expected.operating_weight_tonnes)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in machine_model: existing ID has different content. Transaction aborted.';
  END IF;
END $$;
INSERT INTO public.machine_model (id, manufacturer_id, model_name, model_variant, machine_type, size_class, max_payload_tonnes, operating_weight_tonnes)
SELECT id, manufacturer_id, model_name, model_variant, machine_type, size_class, max_payload_tonnes, operating_weight_tonnes FROM seed_machine_model
ON CONFLICT (id) DO NOTHING;

-- technology_product: 25 records
CREATE TEMP TABLE seed_technology_product ON COMMIT DROP AS
SELECT id, supplier_id, product_name, vendor_term, automation_level, level_basis FROM public.technology_product WITH NO DATA;
INSERT INTO seed_technology_product (id, supplier_id, product_name, vendor_term, automation_level, level_basis) VALUES
  (3001, 201, 'ZZH AssistOne', 'ZZH AssistOne', 'operator_assistance', 'synthetic_test_classification'),
  (3002, 201, 'ZZH TeleRemote-B', 'ZZH TeleRemote-B', 'teleremote', 'synthetic_test_classification'),
  (3003, 201, 'ZZH TeleRemote', 'ZZH TeleRemote', 'teleremote', 'synthetic_test_classification'),
  (3004, 201, 'ZZH SemiAuto', 'ZZH SemiAuto', 'semi_autonomous', 'synthetic_test_classification'),
  (3005, 201, 'ZZH AutoDrive', 'ZZH AutoDrive', 'autonomous', 'synthetic_test_classification'),
  (3006, 202, 'ZR AssistOne', 'ZR AssistOne', 'operator_assistance', 'synthetic_test_classification'),
  (3007, 202, 'ZR TeleRemote-B', 'ZR TeleRemote-B', 'teleremote', 'synthetic_test_classification'),
  (3008, 202, 'ZR TeleRemote', 'ZR TeleRemote', 'teleremote', 'synthetic_test_classification'),
  (3009, 202, 'ZR SemiAuto', 'ZR SemiAuto', 'semi_autonomous', 'synthetic_test_classification'),
  (3010, 202, 'ZR AutoDrive', 'ZR AutoDrive', 'autonomous', 'synthetic_test_classification'),
  (3011, 203, 'HPL AssistOne', 'HPL AssistOne', 'operator_assistance', 'synthetic_test_classification'),
  (3012, 203, 'HPL TeleRemote-B', 'HPL TeleRemote-B', 'teleremote', 'synthetic_test_classification'),
  (3013, 203, 'HPL TeleRemote', 'HPL TeleRemote', 'teleremote', 'synthetic_test_classification'),
  (3014, 203, 'HPL SemiAuto', 'HPL SemiAuto', 'semi_autonomous', 'synthetic_test_classification'),
  (3015, 203, 'HPL AutoDrive', 'HPL AutoDrive', 'autonomous', 'synthetic_test_classification'),
  (3016, 204, 'Northstar AssistOne', 'Northstar AssistOne', 'operator_assistance', 'synthetic_test_classification'),
  (3017, 204, 'Northstar TeleRemote-B', 'Northstar TeleRemote-B', 'teleremote', 'synthetic_test_classification'),
  (3018, 204, 'Northstar TeleRemote', 'Northstar TeleRemote', 'teleremote', 'synthetic_test_classification'),
  (3019, 204, 'Northstar SemiAuto', 'Northstar SemiAuto', 'semi_autonomous', 'synthetic_test_classification'),
  (3020, 204, 'Northstar AutoDrive', 'Northstar AutoDrive', 'autonomous', 'synthetic_test_classification'),
  (3021, 205, 'TerraPilot AssistOne', 'TerraPilot AssistOne', 'operator_assistance', 'synthetic_test_classification'),
  (3022, 205, 'TerraPilot TeleRemote-B', 'TerraPilot TeleRemote-B', 'teleremote', 'synthetic_test_classification'),
  (3023, 205, 'TerraPilot TeleRemote', 'TerraPilot TeleRemote', 'teleremote', 'synthetic_test_classification'),
  (3024, 205, 'TerraPilot SemiAuto', 'TerraPilot SemiAuto', 'semi_autonomous', 'synthetic_test_classification'),
  (3025, 205, 'TerraPilot AutoDrive', 'TerraPilot AutoDrive', 'autonomous', 'synthetic_test_classification');
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.technology_product actual JOIN seed_technology_product expected USING (id)
    WHERE ROW(actual.id, actual.supplier_id, actual.product_name, actual.vendor_term, actual.automation_level, actual.level_basis) IS DISTINCT FROM ROW(expected.id, expected.supplier_id, expected.product_name, expected.vendor_term, expected.automation_level, expected.level_basis)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in technology_product: existing ID has different content. Transaction aborted.';
  END IF;
END $$;
INSERT INTO public.technology_product (id, supplier_id, product_name, vendor_term, automation_level, level_basis)
SELECT id, supplier_id, product_name, vendor_term, automation_level, level_basis FROM seed_technology_product
ON CONFLICT (id) DO NOTHING;

-- deployment: 200 records
CREATE TEMP TABLE seed_deployment ON COMMIT DROP AS
SELECT id, site_id, machine_model_id, technology_product_id, quantity, environment, commissioning_date, status, verification_status, valid_from, valid_to, created_at, updated_at, automation_level, installation_type, commissioning_year, technology_supplier_id FROM public.deployment WITH NO DATA;
INSERT INTO seed_deployment (id, site_id, machine_model_id, technology_product_id, quantity, environment, commissioning_date, status, verification_status, valid_from, valid_to, created_at, updated_at, automation_level, installation_type, commissioning_year) VALUES
  (20001, 10001, 1001, 3001, 2, 'surface', '2018-01-01', 'operational', 'verified', '2018-01-01', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2018),
  (20002, 10001, 1002, 3002, 9, 'underground', '2019-04-08', 'operational', 'verified', '2019-04-08', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20003, 10001, 1003, 3003, 16, 'both', '2020-07-15', 'operational', 'verified', '2020-07-15', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2020),
  (20004, 10001, 1004, 3004, 23, 'surface', '2026-10-22', 'commissioning', 'verified', '2026-10-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20005, 10001, 1005, 3015, 6, 'underground', '2027-01-02', 'announced', 'verified', '2027-01-02', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20006, 10002, 1006, 3006, 14, 'underground', '2023-04-09', 'operational', 'verified', '2023-04-09', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2023),
  (20007, 10002, 1007, 3007, 21, 'both', '2014-07-16', 'decommissioned', 'verified', '2014-07-16', '2019-07-16', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2014),
  (20008, 10002, 1008, 3008, 4, 'surface', '2025-10-23', 'operational', 'verified', '2025-10-23', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20009, 10002, 1009, 3009, 11, 'underground', '2026-01-03', 'commissioning', 'verified', '2026-01-03', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20010, 10002, 1010, 3020, 18, 'both', '2017-04-10', 'decommissioned', 'verified', '2017-04-10', '2022-04-10', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2017),
  (20011, 10003, 1011, 3011, 2, 'both', '2020-07-17', 'operational', 'verified', '2020-07-17', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2020),
  (20012, 10003, 1012, 3012, 9, 'surface', '2021-10-24', 'operational', 'verified', '2021-10-24', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20013, 10003, 1013, 3013, 16, 'underground', '2022-01-04', 'operational', 'verified', '2022-01-04', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2022),
  (20014, 10003, 1014, 3014, 23, 'both', '2026-04-11', 'commissioning', 'verified', '2026-04-11', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20015, 10003, 1015, 3025, 6, 'surface', '2027-07-18', 'announced', 'verified', '2027-07-18', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20016, 10004, 1016, 3016, 14, 'surface', '2025-10-25', 'operational', 'verified', '2025-10-25', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2025),
  (20017, 10004, 1017, 3017, 21, 'underground', '2018-01-05', 'decommissioned', 'verified', '2018-01-05', '2023-01-05', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20018, 10004, 1018, 3018, 4, 'both', '2019-04-12', 'operational', 'verified', '2019-04-12', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20019, 10004, 1019, 3019, 11, 'surface', '2026-07-19', 'commissioning', 'verified', '2026-07-19', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20020, 10004, 1020, 3005, 18, 'underground', '2015-10-26', 'decommissioned', 'verified', '2015-10-26', '2020-10-26', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2015),
  (20021, 10005, 1021, 3021, 2, 'underground', '2022-01-06', 'operational', 'verified', '2022-01-06', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2022),
  (20022, 10005, 1022, 3022, 9, 'both', '2023-04-13', 'operational', 'verified', '2023-04-13', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20023, 10005, 1023, 3023, 16, 'surface', '2024-07-20', 'operational', 'verified', '2024-07-20', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2024),
  (20024, 10005, 1024, 3024, 23, 'underground', '2026-10-27', 'commissioning', 'verified', '2026-10-27', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20025, 10005, 1025, 3010, 6, 'both', '2027-01-07', 'announced', 'verified', '2027-01-07', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20026, 10006, 1026, 3001, 14, 'both', '2019-04-14', 'operational', 'verified', '2019-04-14', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2019),
  (20027, 10006, 1027, 3002, 21, 'surface', '2016-07-21', 'decommissioned', 'verified', '2016-07-21', '2021-07-21', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2016),
  (20028, 10006, 1028, 3003, 4, 'underground', '2021-10-01', 'operational', 'verified', '2021-10-01', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20029, 10006, 1029, 3004, 11, 'both', '2026-01-08', 'commissioning', 'verified', '2026-01-08', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20030, 10006, 1030, 3015, 18, 'surface', '2019-04-15', 'decommissioned', 'verified', '2019-04-15', '2024-04-15', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2019),
  (20031, 10007, 1031, 3006, 2, 'surface', '2024-07-22', 'operational', 'verified', '2024-07-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2024),
  (20032, 10007, 1032, 3007, 9, 'underground', '2025-10-02', 'operational', 'verified', '2025-10-02', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20033, 10007, 1033, 3008, 16, 'both', '2018-01-09', 'operational', 'verified', '2018-01-09', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20034, 10007, 1034, 3009, 23, 'surface', '2026-04-16', 'commissioning', 'verified', '2026-04-16', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20035, 10007, 1035, 3020, 6, 'underground', '2027-07-23', 'announced', 'verified', '2027-07-23', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20036, 10008, 1036, 3011, 14, 'underground', '2021-10-03', 'operational', 'verified', '2021-10-03', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2021),
  (20037, 10008, 1037, 3012, 21, 'both', '2014-01-10', 'decommissioned', 'verified', '2014-01-10', '2019-01-10', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2014),
  (20038, 10008, 1038, 3013, 4, 'surface', '2023-04-17', 'operational', 'verified', '2023-04-17', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20039, 10008, 1039, 3014, 11, 'underground', '2026-07-24', 'commissioning', 'verified', '2026-07-24', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20040, 10008, 1040, 3025, 18, 'both', '2017-10-04', 'decommissioned', 'verified', '2017-10-04', '2022-10-04', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2017),
  (20041, 10009, 1041, 3016, 2, 'both', '2018-01-11', 'operational', 'verified', '2018-01-11', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2018),
  (20042, 10009, 1042, 3017, 9, 'surface', '2019-04-18', 'operational', 'verified', '2019-04-18', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20043, 10009, 1043, 3018, 16, 'underground', '2020-07-25', 'operational', 'verified', '2020-07-25', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2020),
  (20044, 10009, 1044, 3019, 23, 'both', '2026-10-05', 'commissioning', 'verified', '2026-10-05', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20045, 10009, 1045, 3005, 6, 'surface', '2027-01-12', 'announced', 'verified', '2027-01-12', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20046, 10010, 1046, 3021, 14, 'surface', '2023-04-19', 'operational', 'verified', '2023-04-19', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2023),
  (20047, 10010, 1047, 3022, 21, 'underground', '2018-07-26', 'decommissioned', 'verified', '2018-07-26', '2023-07-26', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20048, 10010, 1048, 3023, 4, 'both', '2025-10-06', 'operational', 'verified', '2025-10-06', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20049, 10010, 1049, 3024, 11, 'surface', '2026-01-13', 'commissioning', 'verified', '2026-01-13', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20050, 10010, 1050, 3010, 18, 'underground', '2015-04-20', 'decommissioned', 'verified', '2015-04-20', '2020-04-20', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2015),
  (20051, 10011, 1051, 3001, 2, 'underground', '2020-07-27', 'operational', 'verified', '2020-07-27', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2020),
  (20052, 10011, 1052, 3002, 9, 'both', '2021-10-07', 'operational', 'verified', '2021-10-07', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20053, 10011, 1053, 3003, 16, 'surface', '2022-01-14', 'operational', 'verified', '2022-01-14', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2022),
  (20054, 10011, 1054, 3004, 23, 'underground', '2026-04-21', 'commissioning', 'verified', '2026-04-21', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20055, 10011, 1055, 3015, 6, 'both', '2027-07-01', 'announced', 'verified', '2027-07-01', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20056, 10012, 1056, 3006, 14, 'both', '2025-10-08', 'operational', 'verified', '2025-10-08', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2025),
  (20057, 10012, 1057, 3007, 21, 'surface', '2016-01-15', 'decommissioned', 'verified', '2016-01-15', '2021-01-15', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2016),
  (20058, 10012, 1058, 3008, 4, 'underground', '2019-04-22', 'operational', 'verified', '2019-04-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20059, 10012, 1059, 3009, 11, 'both', '2026-07-02', 'commissioning', 'verified', '2026-07-02', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20060, 10012, 1060, 3020, 18, 'surface', '2019-10-09', 'decommissioned', 'verified', '2019-10-09', '2024-10-09', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2019),
  (20061, 10013, 1061, 3011, 2, 'surface', '2022-01-16', 'operational', 'verified', '2022-01-16', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2022),
  (20062, 10013, 1062, 3012, 9, 'underground', '2023-04-23', 'operational', 'verified', '2023-04-23', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20063, 10013, 1063, 3013, 16, 'both', '2024-07-03', 'operational', 'verified', '2024-07-03', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2024),
  (20064, 10013, 1064, 3014, 23, 'surface', '2026-10-10', 'commissioning', 'verified', '2026-10-10', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20065, 10013, 1065, 3025, 6, 'underground', '2027-01-17', 'announced', 'verified', '2027-01-17', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20066, 10014, 1066, 3016, 14, 'underground', '2019-04-24', 'operational', 'verified', '2019-04-24', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2019),
  (20067, 10014, 1067, 3017, 21, 'both', '2014-07-04', 'decommissioned', 'verified', '2014-07-04', '2019-07-04', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2014),
  (20068, 10014, 1068, 3018, 4, 'surface', '2021-10-11', 'operational', 'verified', '2021-10-11', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20069, 10014, 1069, 3019, 11, 'underground', '2026-01-18', 'commissioning', 'verified', '2026-01-18', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20070, 10014, 1070, 3005, 18, 'both', '2017-04-25', 'decommissioned', 'verified', '2017-04-25', '2022-04-25', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2017),
  (20071, 10015, 1071, 3021, 2, 'both', '2024-07-05', 'operational', 'verified', '2024-07-05', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2024),
  (20072, 10015, 1072, 3022, 9, 'surface', '2025-10-12', 'operational', 'verified', '2025-10-12', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20073, 10015, 1073, 3023, 16, 'underground', '2018-01-19', 'operational', 'verified', '2018-01-19', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20074, 10015, 1074, 3024, 23, 'both', '2026-04-26', 'commissioning', 'verified', '2026-04-26', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20075, 10015, 1075, 3010, 6, 'surface', '2027-07-06', 'announced', 'verified', '2027-07-06', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20076, 10016, 1076, 3001, 14, 'surface', '2021-10-13', 'operational', 'verified', '2021-10-13', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2021),
  (20077, 10016, 1077, 3002, 21, 'underground', '2018-01-20', 'decommissioned', 'verified', '2018-01-20', '2023-01-20', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20078, 10016, 1078, 3003, 4, 'both', '2023-04-27', 'operational', 'verified', '2023-04-27', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20079, 10016, 1079, 3004, 11, 'surface', '2026-07-07', 'commissioning', 'verified', '2026-07-07', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20080, 10016, 1080, 3015, 18, 'underground', '2015-10-14', 'decommissioned', 'verified', '2015-10-14', '2020-10-14', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2015),
  (20081, 10017, 1081, 3006, 2, 'underground', '2018-01-21', 'operational', 'verified', '2018-01-21', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2018),
  (20082, 10017, 1082, 3007, 9, 'both', '2019-04-01', 'operational', 'verified', '2019-04-01', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20083, 10017, 1083, 3008, 16, 'surface', '2020-07-08', 'operational', 'verified', '2020-07-08', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2020),
  (20084, 10017, 1084, 3009, 23, 'underground', '2026-10-15', 'commissioning', 'verified', '2026-10-15', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20085, 10017, 1085, 3020, 6, 'both', '2027-01-22', 'announced', 'verified', '2027-01-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20086, 10018, 1086, 3011, 14, 'both', '2023-04-02', 'operational', 'verified', '2023-04-02', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2023),
  (20087, 10018, 1087, 3012, 21, 'surface', '2016-07-09', 'decommissioned', 'verified', '2016-07-09', '2021-07-09', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2016),
  (20088, 10018, 1088, 3013, 4, 'underground', '2025-10-16', 'operational', 'verified', '2025-10-16', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20089, 10018, 1089, 3014, 11, 'both', '2026-01-23', 'commissioning', 'verified', '2026-01-23', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20090, 10018, 1090, 3025, 18, 'surface', '2019-04-03', 'decommissioned', 'verified', '2019-04-03', '2024-04-03', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2019),
  (20091, 10019, 1091, 3016, 2, 'surface', '2020-07-10', 'operational', 'verified', '2020-07-10', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2020),
  (20092, 10019, 1092, 3017, 9, 'underground', '2021-10-17', 'operational', 'verified', '2021-10-17', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20093, 10019, 1093, 3018, 16, 'both', '2022-01-24', 'operational', 'verified', '2022-01-24', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2022),
  (20094, 10019, 1094, 3019, 23, 'surface', '2026-04-04', 'commissioning', 'verified', '2026-04-04', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20095, 10019, 1095, 3005, 6, 'underground', '2027-07-11', 'announced', 'verified', '2027-07-11', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20096, 10020, 1096, 3021, 14, 'underground', '2025-10-18', 'operational', 'verified', '2025-10-18', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2025),
  (20097, 10020, 1097, 3022, 21, 'both', '2014-01-25', 'decommissioned', 'verified', '2014-01-25', '2019-01-25', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2014),
  (20098, 10020, 1098, 3023, 4, 'surface', '2019-04-05', 'operational', 'verified', '2019-04-05', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20099, 10020, 1099, 3024, 11, 'underground', '2026-07-12', 'commissioning', 'verified', '2026-07-12', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20100, 10020, 1100, 3010, 18, 'both', '2017-10-19', 'decommissioned', 'verified', '2017-10-19', '2022-10-19', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2017),
  (20101, 10021, 1001, 3001, 2, 'both', '2022-01-26', 'operational', 'verified', '2022-01-26', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2022),
  (20102, 10021, 1002, 3002, 9, 'surface', '2023-04-06', 'operational', 'verified', '2023-04-06', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20103, 10021, 1003, 3003, 16, 'underground', '2024-07-13', 'operational', 'verified', '2024-07-13', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2024),
  (20104, 10021, 1004, 3004, 23, 'both', '2026-10-20', 'commissioning', 'verified', '2026-10-20', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20105, 10021, 1005, 3015, 6, 'surface', '2027-01-27', 'announced', 'verified', '2027-01-27', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20106, 10022, 1006, 3006, 14, 'surface', '2019-04-07', 'operational', 'verified', '2019-04-07', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2019),
  (20107, 10022, 1007, 3007, 21, 'underground', '2018-07-14', 'decommissioned', 'verified', '2018-07-14', '2023-07-14', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20108, 10022, 1008, 3008, 4, 'both', '2021-10-21', 'operational', 'verified', '2021-10-21', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20109, 10022, 1009, 3009, 11, 'surface', '2026-01-01', 'commissioning', 'verified', '2026-01-01', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20110, 10022, 1010, 3020, 18, 'underground', '2015-04-08', 'decommissioned', 'verified', '2015-04-08', '2020-04-08', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2015),
  (20111, 10023, 1011, 3011, 2, 'underground', '2024-07-15', 'operational', 'verified', '2024-07-15', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2024),
  (20112, 10023, 1012, 3012, 9, 'both', '2025-10-22', 'operational', 'verified', '2025-10-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20113, 10023, 1013, 3013, 16, 'surface', '2018-01-02', 'operational', 'verified', '2018-01-02', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20114, 10023, 1014, 3014, 23, 'underground', '2026-04-09', 'commissioning', 'verified', '2026-04-09', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20115, 10023, 1015, 3025, 6, 'both', '2027-07-16', 'announced', 'verified', '2027-07-16', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20116, 10024, 1016, 3016, 14, 'both', '2021-10-23', 'operational', 'verified', '2021-10-23', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2021),
  (20117, 10024, 1017, 3017, 21, 'surface', '2016-01-03', 'decommissioned', 'verified', '2016-01-03', '2021-01-03', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2016),
  (20118, 10024, 1018, 3018, 4, 'underground', '2023-04-10', 'operational', 'verified', '2023-04-10', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20119, 10024, 1019, 3019, 11, 'both', '2026-07-17', 'commissioning', 'verified', '2026-07-17', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20120, 10024, 1020, 3005, 18, 'surface', '2019-10-24', 'decommissioned', 'verified', '2019-10-24', '2024-10-24', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2019),
  (20121, 10025, 1021, 3021, 2, 'surface', '2018-01-04', 'operational', 'verified', '2018-01-04', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2018),
  (20122, 10025, 1022, 3022, 9, 'underground', '2019-04-11', 'operational', 'verified', '2019-04-11', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20123, 10025, 1023, 3023, 16, 'both', '2020-07-18', 'operational', 'verified', '2020-07-18', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2020),
  (20124, 10025, 1024, 3024, 23, 'surface', '2026-10-25', 'commissioning', 'verified', '2026-10-25', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20125, 10025, 1025, 3010, 6, 'underground', '2027-01-05', 'announced', 'verified', '2027-01-05', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20126, 10026, 1026, 3001, 14, 'underground', '2023-04-12', 'operational', 'verified', '2023-04-12', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2023),
  (20127, 10026, 1027, 3002, 21, 'both', '2014-07-19', 'decommissioned', 'verified', '2014-07-19', '2019-07-19', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2014),
  (20128, 10026, 1028, 3003, 4, 'surface', '2025-10-26', 'operational', 'verified', '2025-10-26', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20129, 10026, 1029, 3004, 11, 'underground', '2026-01-06', 'commissioning', 'verified', '2026-01-06', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20130, 10026, 1030, 3015, 18, 'both', '2017-04-13', 'decommissioned', 'verified', '2017-04-13', '2022-04-13', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2017),
  (20131, 10027, 1031, 3006, 2, 'both', '2020-07-20', 'operational', 'verified', '2020-07-20', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2020),
  (20132, 10027, 1032, 3007, 9, 'surface', '2021-10-27', 'operational', 'verified', '2021-10-27', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20133, 10027, 1033, 3008, 16, 'underground', '2022-01-07', 'operational', 'verified', '2022-01-07', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2022),
  (20134, 10027, 1034, 3009, 23, 'both', '2026-04-14', 'commissioning', 'unverified', '2026-04-14', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20135, 10027, 1035, 3020, 6, 'surface', '2027-07-21', 'announced', 'unverified', '2027-07-21', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20136, 10028, 1036, 3011, 14, 'surface', '2025-10-01', 'operational', 'unverified', '2025-10-01', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2025),
  (20137, 10028, 1037, 3012, 21, 'underground', '2018-01-08', 'decommissioned', 'unverified', '2018-01-08', '2023-01-08', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20138, 10028, 1038, 3013, 4, 'both', '2019-04-15', 'operational', 'unverified', '2019-04-15', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20139, 10028, 1039, 3014, 11, 'surface', '2026-07-22', 'commissioning', 'unverified', '2026-07-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20140, 10028, 1040, 3025, 18, 'underground', '2015-10-02', 'decommissioned', 'unverified', '2015-10-02', '2020-10-02', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2015),
  (20141, 10029, 1041, 3016, 2, 'underground', '2022-01-09', 'operational', 'unverified', '2022-01-09', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2022),
  (20142, 10029, 1042, 3017, 9, 'both', '2023-04-16', 'operational', 'unverified', '2023-04-16', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20143, 10029, 1043, 3018, 16, 'surface', '2024-07-23', 'operational', 'unverified', '2024-07-23', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2024),
  (20144, 10029, 1044, 3019, 23, 'underground', '2026-10-03', 'commissioning', 'unverified', '2026-10-03', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20145, 10029, 1045, 3005, 6, 'both', '2027-01-10', 'announced', 'unverified', '2027-01-10', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20146, 10030, 1046, 3021, 14, 'both', '2019-04-17', 'operational', 'unverified', '2019-04-17', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2019),
  (20147, 10030, 1047, 3022, 21, 'surface', '2016-07-24', 'decommissioned', 'unverified', '2016-07-24', '2021-07-24', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2016),
  (20148, 10030, 1048, 3023, 4, 'underground', '2021-10-04', 'operational', 'unverified', '2021-10-04', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20149, 10030, 1049, 3024, 11, 'both', '2026-01-11', 'commissioning', 'unverified', '2026-01-11', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20150, 10030, 1050, 3010, 18, 'surface', '2019-04-18', 'decommissioned', 'unverified', '2019-04-18', '2024-04-18', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2019),
  (20151, 10031, 1051, 3001, 2, 'surface', '2024-07-25', 'operational', 'unverified', '2024-07-25', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2024),
  (20152, 10031, 1052, 3002, 9, 'underground', '2025-10-05', 'operational', 'unverified', '2025-10-05', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20153, 10031, 1053, 3003, 16, 'both', '2018-01-12', 'operational', 'unverified', '2018-01-12', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20154, 10031, 1054, 3004, 23, 'surface', '2026-04-19', 'commissioning', 'unverified', '2026-04-19', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20155, 10031, 1055, 3015, 6, 'underground', '2027-07-26', 'announced', 'unverified', '2027-07-26', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20156, 10032, 1056, 3006, 14, 'underground', '2021-10-06', 'operational', 'unverified', '2021-10-06', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2021),
  (20157, 10032, 1057, 3007, 21, 'both', '2014-01-13', 'decommissioned', 'unverified', '2014-01-13', '2019-01-13', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2014),
  (20158, 10032, 1058, 3008, 4, 'surface', '2023-04-20', 'operational', 'unverified', '2023-04-20', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20159, 10032, 1059, 3009, 11, 'underground', '2026-07-27', 'commissioning', 'unverified', '2026-07-27', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20160, 10032, 1060, 3020, 18, 'both', '2017-10-07', 'decommissioned', 'unverified', '2017-10-07', '2022-10-07', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2017),
  (20161, 10033, 1061, 3011, 2, 'both', '2018-01-14', 'operational', 'unverified', '2018-01-14', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2018),
  (20162, 10033, 1062, 3012, 9, 'surface', '2019-04-21', 'operational', 'unverified', '2019-04-21', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20163, 10033, 1063, 3013, 16, 'underground', '2020-07-01', 'operational', 'unverified', '2020-07-01', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2020),
  (20164, 10033, 1064, 3014, 23, 'both', '2026-10-08', 'commissioning', 'unverified', '2026-10-08', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20165, 10033, 1065, 3025, 6, 'surface', '2027-01-15', 'announced', 'unverified', '2027-01-15', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20166, 10034, 1066, 3016, 14, 'surface', '2023-04-22', 'operational', 'unverified', '2023-04-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2023),
  (20167, 10034, 1067, 3017, 21, 'underground', '2018-07-02', 'decommissioned', 'unverified', '2018-07-02', '2023-07-02', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20168, 10034, 1068, 3018, 4, 'both', '2025-10-09', 'operational', 'unverified', '2025-10-09', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20169, 10034, 1069, 3019, 11, 'surface', '2026-01-16', 'commissioning', 'unverified', '2026-01-16', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20170, 10034, 1070, 3005, 18, 'underground', '2015-04-23', 'decommissioned', 'unverified', '2015-04-23', '2020-04-23', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2015),
  (20171, 10035, 1071, 3021, 2, 'underground', '2020-07-03', 'operational', 'unverified', '2020-07-03', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2020),
  (20172, 10035, 1072, 3022, 9, 'both', '2021-10-10', 'operational', 'unverified', '2021-10-10', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20173, 10035, 1073, 3023, 16, 'surface', '2022-01-17', 'operational', 'unverified', '2022-01-17', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2022),
  (20174, 10035, 1074, 3024, 23, 'underground', '2026-04-24', 'commissioning', 'unverified', '2026-04-24', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20175, 10035, 1075, 3010, 6, 'both', '2027-07-04', 'announced', 'unverified', '2027-07-04', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20176, 10036, 1076, 3001, 14, 'both', '2025-10-11', 'operational', 'unverified', '2025-10-11', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2025),
  (20177, 10036, 1077, 3002, 21, 'surface', '2016-01-18', 'decommissioned', 'unverified', '2016-01-18', '2021-01-18', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2016),
  (20178, 10036, 1078, 3003, 4, 'underground', '2019-04-25', 'operational', 'unverified', '2019-04-25', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2019),
  (20179, 10036, 1079, 3004, 11, 'both', '2026-07-05', 'commissioning', 'unverified', '2026-07-05', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20180, 10036, 1080, 3015, 18, 'surface', '2019-10-12', 'decommissioned', 'unverified', '2019-10-12', '2024-10-12', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2019),
  (20181, 10037, 1081, 3006, 2, 'surface', '2022-01-19', 'operational', 'unverified', '2022-01-19', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2022),
  (20182, 10037, 1082, 3007, 9, 'underground', '2023-04-26', 'operational', 'unverified', '2023-04-26', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20183, 10037, 1083, 3008, 16, 'both', '2024-07-06', 'operational', 'unverified', '2024-07-06', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2024),
  (20184, 10037, 1084, 3009, 23, 'surface', '2026-10-13', 'commissioning', 'unverified', '2026-10-13', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20185, 10037, 1085, 3020, 6, 'underground', '2027-01-20', 'announced', 'unverified', '2027-01-20', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20186, 10038, 1086, 3011, 14, 'underground', '2019-04-27', 'operational', 'unverified', '2019-04-27', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2019),
  (20187, 10038, 1087, 3012, 21, 'both', '2014-07-07', 'decommissioned', 'unverified', '2014-07-07', '2019-07-07', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2014),
  (20188, 10038, 1088, 3013, 4, 'surface', '2021-10-14', 'operational', 'unverified', '2021-10-14', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2021),
  (20189, 10038, 1089, 3014, 11, 'underground', '2026-01-21', 'commissioning', 'unverified', '2026-01-21', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20190, 10038, 1090, 3025, 18, 'both', '2017-04-01', 'decommissioned', 'unverified', '2017-04-01', '2022-04-01', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2017),
  (20191, 10039, 1091, 3016, 2, 'both', '2024-07-08', 'operational', 'unverified', '2024-07-08', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2024),
  (20192, 10039, 1092, 3017, 9, 'surface', '2025-10-15', 'operational', 'unverified', '2025-10-15', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2025),
  (20193, 10039, 1093, 3018, 16, 'underground', '2018-01-22', 'operational', 'unverified', '2018-01-22', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20194, 10039, 1094, 3019, 23, 'both', '2026-04-02', 'commissioning', 'unverified', '2026-04-02', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20195, 10039, 1095, 3005, 6, 'surface', '2027-07-09', 'announced', 'unverified', '2027-07-09', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2027),
  (20196, 10040, 1096, 3021, 14, 'surface', '2021-10-16', 'operational', 'unverified', '2021-10-16', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'operator_assistance', 'unknown', 2021),
  (20197, 10040, 1097, 3022, 21, 'underground', '2018-01-23', 'decommissioned', 'unverified', '2018-01-23', '2023-01-23', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2018),
  (20198, 10040, 1098, 3023, 4, 'both', '2023-04-03', 'operational', 'unverified', '2023-04-03', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'teleremote', 'unknown', 2023),
  (20199, 10040, 1099, 3024, 11, 'surface', '2026-07-10', 'commissioning', 'unverified', '2026-07-10', NULL, '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'semi_autonomous', 'unknown', 2026),
  (20200, 10040, 1100, 3010, 18, 'underground', '2015-10-17', 'decommissioned', 'unverified', '2015-10-17', '2020-10-17', '2026-01-01 00:00:00+00', '2026-09-01 00:00:00+00', 'autonomous', 'unknown', 2015);
-- Recover each fixture supplier from its existing named product.
-- Keep the deployment fixture values and business timestamps unchanged.
UPDATE seed_deployment AS d
  SET technology_supplier_id = p.supplier_id
  FROM seed_technology_product AS p
  WHERE p.id = d.technology_product_id;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.deployment actual JOIN seed_deployment expected USING (id)
    WHERE ROW(actual.id, actual.site_id, actual.machine_model_id, actual.technology_product_id, actual.quantity, actual.environment, actual.commissioning_date, actual.status, actual.verification_status, actual.valid_from, actual.valid_to, actual.created_at, actual.updated_at, actual.automation_level, actual.installation_type, actual.commissioning_year, actual.technology_supplier_id) IS DISTINCT FROM ROW(expected.id, expected.site_id, expected.machine_model_id, expected.technology_product_id, expected.quantity, expected.environment, expected.commissioning_date, expected.status, expected.verification_status, expected.valid_from, expected.valid_to, expected.created_at, expected.updated_at, expected.automation_level, expected.installation_type, expected.commissioning_year, expected.technology_supplier_id)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in deployment: existing ID has different content. Transaction aborted.';
  END IF;
END $$;
INSERT INTO public.deployment (id, site_id, machine_model_id, technology_product_id, quantity, environment, commissioning_date, status, verification_status, valid_from, valid_to, created_at, updated_at, automation_level, installation_type, commissioning_year, technology_supplier_id)
SELECT id, site_id, machine_model_id, technology_product_id, quantity, environment, commissioning_date, status, verification_status, valid_from, valid_to, created_at, updated_at, automation_level, installation_type, commissioning_year, technology_supplier_id FROM seed_deployment
ON CONFLICT (id) DO NOTHING;


-- Synthetic evidence required by verified test fixtures; NOT real sources.
CREATE TEMP TABLE seed_evidence ON COMMIT DROP AS
SELECT id, deployment_id, url, source_type, publisher, published_date
FROM public.evidence WITH NO DATA;
INSERT INTO seed_evidence (id, deployment_id, url, source_type, publisher, published_date)
VALUES
  (40001, 20001, 'https://evidence.invalid/synthetic/deployments/20001', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40002, 20002, 'https://evidence.invalid/synthetic/deployments/20002', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40003, 20003, 'https://evidence.invalid/synthetic/deployments/20003', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40004, 20004, 'https://evidence.invalid/synthetic/deployments/20004', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40005, 20005, 'https://evidence.invalid/synthetic/deployments/20005', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40006, 20006, 'https://evidence.invalid/synthetic/deployments/20006', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40007, 20007, 'https://evidence.invalid/synthetic/deployments/20007', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40008, 20008, 'https://evidence.invalid/synthetic/deployments/20008', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40009, 20009, 'https://evidence.invalid/synthetic/deployments/20009', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40010, 20010, 'https://evidence.invalid/synthetic/deployments/20010', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40011, 20011, 'https://evidence.invalid/synthetic/deployments/20011', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40012, 20012, 'https://evidence.invalid/synthetic/deployments/20012', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40013, 20013, 'https://evidence.invalid/synthetic/deployments/20013', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40014, 20014, 'https://evidence.invalid/synthetic/deployments/20014', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40015, 20015, 'https://evidence.invalid/synthetic/deployments/20015', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40016, 20016, 'https://evidence.invalid/synthetic/deployments/20016', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40017, 20017, 'https://evidence.invalid/synthetic/deployments/20017', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40018, 20018, 'https://evidence.invalid/synthetic/deployments/20018', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40019, 20019, 'https://evidence.invalid/synthetic/deployments/20019', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40020, 20020, 'https://evidence.invalid/synthetic/deployments/20020', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40021, 20021, 'https://evidence.invalid/synthetic/deployments/20021', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40022, 20022, 'https://evidence.invalid/synthetic/deployments/20022', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40023, 20023, 'https://evidence.invalid/synthetic/deployments/20023', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40024, 20024, 'https://evidence.invalid/synthetic/deployments/20024', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40025, 20025, 'https://evidence.invalid/synthetic/deployments/20025', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40026, 20026, 'https://evidence.invalid/synthetic/deployments/20026', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40027, 20027, 'https://evidence.invalid/synthetic/deployments/20027', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40028, 20028, 'https://evidence.invalid/synthetic/deployments/20028', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40029, 20029, 'https://evidence.invalid/synthetic/deployments/20029', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40030, 20030, 'https://evidence.invalid/synthetic/deployments/20030', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40031, 20031, 'https://evidence.invalid/synthetic/deployments/20031', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40032, 20032, 'https://evidence.invalid/synthetic/deployments/20032', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40033, 20033, 'https://evidence.invalid/synthetic/deployments/20033', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40034, 20034, 'https://evidence.invalid/synthetic/deployments/20034', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40035, 20035, 'https://evidence.invalid/synthetic/deployments/20035', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40036, 20036, 'https://evidence.invalid/synthetic/deployments/20036', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40037, 20037, 'https://evidence.invalid/synthetic/deployments/20037', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40038, 20038, 'https://evidence.invalid/synthetic/deployments/20038', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40039, 20039, 'https://evidence.invalid/synthetic/deployments/20039', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40040, 20040, 'https://evidence.invalid/synthetic/deployments/20040', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40041, 20041, 'https://evidence.invalid/synthetic/deployments/20041', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40042, 20042, 'https://evidence.invalid/synthetic/deployments/20042', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40043, 20043, 'https://evidence.invalid/synthetic/deployments/20043', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40044, 20044, 'https://evidence.invalid/synthetic/deployments/20044', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40045, 20045, 'https://evidence.invalid/synthetic/deployments/20045', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40046, 20046, 'https://evidence.invalid/synthetic/deployments/20046', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40047, 20047, 'https://evidence.invalid/synthetic/deployments/20047', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40048, 20048, 'https://evidence.invalid/synthetic/deployments/20048', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40049, 20049, 'https://evidence.invalid/synthetic/deployments/20049', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40050, 20050, 'https://evidence.invalid/synthetic/deployments/20050', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40051, 20051, 'https://evidence.invalid/synthetic/deployments/20051', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40052, 20052, 'https://evidence.invalid/synthetic/deployments/20052', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40053, 20053, 'https://evidence.invalid/synthetic/deployments/20053', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40054, 20054, 'https://evidence.invalid/synthetic/deployments/20054', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40055, 20055, 'https://evidence.invalid/synthetic/deployments/20055', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40056, 20056, 'https://evidence.invalid/synthetic/deployments/20056', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40057, 20057, 'https://evidence.invalid/synthetic/deployments/20057', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40058, 20058, 'https://evidence.invalid/synthetic/deployments/20058', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40059, 20059, 'https://evidence.invalid/synthetic/deployments/20059', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40060, 20060, 'https://evidence.invalid/synthetic/deployments/20060', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40061, 20061, 'https://evidence.invalid/synthetic/deployments/20061', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40062, 20062, 'https://evidence.invalid/synthetic/deployments/20062', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40063, 20063, 'https://evidence.invalid/synthetic/deployments/20063', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40064, 20064, 'https://evidence.invalid/synthetic/deployments/20064', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40065, 20065, 'https://evidence.invalid/synthetic/deployments/20065', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40066, 20066, 'https://evidence.invalid/synthetic/deployments/20066', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40067, 20067, 'https://evidence.invalid/synthetic/deployments/20067', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40068, 20068, 'https://evidence.invalid/synthetic/deployments/20068', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40069, 20069, 'https://evidence.invalid/synthetic/deployments/20069', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40070, 20070, 'https://evidence.invalid/synthetic/deployments/20070', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40071, 20071, 'https://evidence.invalid/synthetic/deployments/20071', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40072, 20072, 'https://evidence.invalid/synthetic/deployments/20072', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40073, 20073, 'https://evidence.invalid/synthetic/deployments/20073', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40074, 20074, 'https://evidence.invalid/synthetic/deployments/20074', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40075, 20075, 'https://evidence.invalid/synthetic/deployments/20075', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40076, 20076, 'https://evidence.invalid/synthetic/deployments/20076', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40077, 20077, 'https://evidence.invalid/synthetic/deployments/20077', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40078, 20078, 'https://evidence.invalid/synthetic/deployments/20078', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40079, 20079, 'https://evidence.invalid/synthetic/deployments/20079', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40080, 20080, 'https://evidence.invalid/synthetic/deployments/20080', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40081, 20081, 'https://evidence.invalid/synthetic/deployments/20081', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40082, 20082, 'https://evidence.invalid/synthetic/deployments/20082', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40083, 20083, 'https://evidence.invalid/synthetic/deployments/20083', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40084, 20084, 'https://evidence.invalid/synthetic/deployments/20084', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40085, 20085, 'https://evidence.invalid/synthetic/deployments/20085', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40086, 20086, 'https://evidence.invalid/synthetic/deployments/20086', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40087, 20087, 'https://evidence.invalid/synthetic/deployments/20087', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40088, 20088, 'https://evidence.invalid/synthetic/deployments/20088', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40089, 20089, 'https://evidence.invalid/synthetic/deployments/20089', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40090, 20090, 'https://evidence.invalid/synthetic/deployments/20090', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40091, 20091, 'https://evidence.invalid/synthetic/deployments/20091', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40092, 20092, 'https://evidence.invalid/synthetic/deployments/20092', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40093, 20093, 'https://evidence.invalid/synthetic/deployments/20093', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40094, 20094, 'https://evidence.invalid/synthetic/deployments/20094', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40095, 20095, 'https://evidence.invalid/synthetic/deployments/20095', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40096, 20096, 'https://evidence.invalid/synthetic/deployments/20096', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40097, 20097, 'https://evidence.invalid/synthetic/deployments/20097', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40098, 20098, 'https://evidence.invalid/synthetic/deployments/20098', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40099, 20099, 'https://evidence.invalid/synthetic/deployments/20099', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40100, 20100, 'https://evidence.invalid/synthetic/deployments/20100', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40101, 20101, 'https://evidence.invalid/synthetic/deployments/20101', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40102, 20102, 'https://evidence.invalid/synthetic/deployments/20102', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40103, 20103, 'https://evidence.invalid/synthetic/deployments/20103', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40104, 20104, 'https://evidence.invalid/synthetic/deployments/20104', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40105, 20105, 'https://evidence.invalid/synthetic/deployments/20105', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40106, 20106, 'https://evidence.invalid/synthetic/deployments/20106', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40107, 20107, 'https://evidence.invalid/synthetic/deployments/20107', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40108, 20108, 'https://evidence.invalid/synthetic/deployments/20108', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40109, 20109, 'https://evidence.invalid/synthetic/deployments/20109', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40110, 20110, 'https://evidence.invalid/synthetic/deployments/20110', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40111, 20111, 'https://evidence.invalid/synthetic/deployments/20111', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40112, 20112, 'https://evidence.invalid/synthetic/deployments/20112', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40113, 20113, 'https://evidence.invalid/synthetic/deployments/20113', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40114, 20114, 'https://evidence.invalid/synthetic/deployments/20114', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40115, 20115, 'https://evidence.invalid/synthetic/deployments/20115', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40116, 20116, 'https://evidence.invalid/synthetic/deployments/20116', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40117, 20117, 'https://evidence.invalid/synthetic/deployments/20117', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40118, 20118, 'https://evidence.invalid/synthetic/deployments/20118', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40119, 20119, 'https://evidence.invalid/synthetic/deployments/20119', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40120, 20120, 'https://evidence.invalid/synthetic/deployments/20120', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40121, 20121, 'https://evidence.invalid/synthetic/deployments/20121', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40122, 20122, 'https://evidence.invalid/synthetic/deployments/20122', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40123, 20123, 'https://evidence.invalid/synthetic/deployments/20123', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40124, 20124, 'https://evidence.invalid/synthetic/deployments/20124', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40125, 20125, 'https://evidence.invalid/synthetic/deployments/20125', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40126, 20126, 'https://evidence.invalid/synthetic/deployments/20126', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40127, 20127, 'https://evidence.invalid/synthetic/deployments/20127', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40128, 20128, 'https://evidence.invalid/synthetic/deployments/20128', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40129, 20129, 'https://evidence.invalid/synthetic/deployments/20129', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40130, 20130, 'https://evidence.invalid/synthetic/deployments/20130', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40131, 20131, 'https://evidence.invalid/synthetic/deployments/20131', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40132, 20132, 'https://evidence.invalid/synthetic/deployments/20132', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30'),
  (40133, 20133, 'https://evidence.invalid/synthetic/deployments/20133', 'other', 'SYNTHETIC TEST FIXTURE - NOT REAL EVIDENCE', DATE '2026-09-30');
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.evidence actual JOIN seed_evidence expected USING (id)
    WHERE ROW(actual.id, actual.deployment_id, actual.url, actual.source_type, actual.publisher, actual.published_date)
      IS DISTINCT FROM ROW(expected.id, expected.deployment_id, expected.url, expected.source_type, expected.publisher, expected.published_date)
  ) THEN
    RAISE EXCEPTION 'Seed conflict in evidence: existing ID has different content';
  END IF;
END $$;
INSERT INTO public.evidence (id, deployment_id, url, source_type, publisher, published_date)
SELECT id, deployment_id, url, source_type, publisher, published_date FROM seed_evidence
ON CONFLICT (id) DO NOTHING;
SET CONSTRAINTS ALL IMMEDIATE;

-- Fail the transaction if the maintained seed is incomplete after insertion.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.deployment WHERE id BETWEEN 20001 AND 20200) <> 200 THEN
    RAISE EXCEPTION 'Seed verification failed: expected 200 deployments';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.deployment
    WHERE id BETWEEN 20001 AND 20200
      AND verification_status = 'verified'
  ) <> 133 THEN
    RAISE EXCEPTION 'Seed verification failed: expected 133 verified deployments';
  END IF;

  IF (SELECT COUNT(*) FROM public.evidence WHERE id BETWEEN 40001 AND 40133) <> 133 THEN
    RAISE EXCEPTION 'Seed verification failed: expected 133 evidence records';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.deployment deployment
    WHERE deployment.id BETWEEN 20001 AND 20200
      AND deployment.verification_status = 'verified'
      AND NOT EXISTS (
        SELECT 1
        FROM public.evidence evidence
        WHERE evidence.deployment_id = deployment.id
      )
  ) THEN
    RAISE EXCEPTION 'Seed verification failed: verified deployment has no evidence';
  END IF;
END $$;

-- Advance identity sequences without moving an existing sequence backwards.
-- PostgreSQL sequence changes are not transactional; this runs last.
DO $$
DECLARE
  table_name text;
  seq_name text;
  max_id bigint;
  previous_value bigint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['company','region','site','site_company_role','machine_model','technology_product','deployment','evidence'] LOOP
    seq_name := pg_get_serial_sequence('public.' || table_name, 'id');
    IF seq_name IS NOT NULL THEN
      EXECUTE format('SELECT MAX(id) FROM public.%I', table_name) INTO max_id;
      EXECUTE format('SELECT last_value FROM %s', seq_name::regclass) INTO previous_value;
      IF max_id IS NOT NULL THEN
        PERFORM setval(seq_name::regclass, GREATEST(max_id, previous_value), true);
      END IF;
    END IF;
  END LOOP;
END $$;
COMMIT;

-- Expected seed-owned counts (not total database counts):
-- company: 25
-- region: 40
-- site: 40
-- site_company_role: 40
-- machine_model: 100
-- technology_product: 25
-- deployment: 200
-- evidence: 133
-- deployment verification: 133 verified, 67 unverified
