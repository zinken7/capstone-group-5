-- Development test data based on public sources; not verified industry data.
-- Original workbook claims are preserved, including disputed entries.
BEGIN;
SET LOCAL search_path = public, pg_temp;
SET LOCAL TIME ZONE 'UTC';
SELECT pg_advisory_xact_lock(240917, 8);

CREATE TEMP TABLE seed_company ON COMMIT DROP AS SELECT * FROM public.company WITH NO DATA;

INSERT INTO seed_company (id, name, country_code, created_at) VALUES
 (-917002, 'Inner Mongolia North Hauler Joint Stock Co., Ltd. (NHL / Beifang Gufen)', 'CN', '2026-09-17T00:00:00Z'),
 (-917004, 'Xiangdian (XEMC) Heavy Machinery Co., Ltd.', 'CN', '2026-09-17T00:00:00Z'),
 (-917007, 'Zhongke Huituo (Beijing) Technology Co., Ltd. (brand: WAYTOUS)', 'CN', '2026-09-17T00:00:00Z'),
 (-917008, 'Inner Mongolia Power Investment Energy Co., Ltd.', 'CN', '2026-09-17T00:00:00Z'),
 (-917009, 'China Energy Investment Corp. - Shenhua Zhungeer Energy Co., Ltd. (Zhunneng Group)', 'CN', '2026-09-17T00:00:00Z'),
 (-917010, 'China Coal Pingshuo Group Co., Ltd.', 'CN', '2026-09-17T00:00:00Z'),
 (-917015, 'Caterpillar Inc.', 'US', '2026-09-17T00:00:00Z'),
 (-917016, 'Komatsu Ltd.', 'JP', '2026-09-17T00:00:00Z'),
 (-917017, 'Hitachi Construction Machinery Co., Ltd.', 'JP', '2026-09-17T00:00:00Z'),
 (-917018, 'Liebherr Mining Equipment (Liebherr-International AG)', 'CH', '2026-09-17T00:00:00Z'),
 (-917019, 'Epiroc AB', 'SE', '2026-09-17T00:00:00Z'),
 (-917020, 'Modular Mining Systems, Inc.', 'US', '2026-09-17T00:00:00Z'),
 (-917021, 'Rio Tinto Group', 'AU', '2026-09-17T00:00:00Z'),
 (-917022, 'BHP Group Limited', 'AU', '2026-09-17T00:00:00Z'),
 (-917023, 'Fortescue Metals Group Ltd.', 'AU', '2026-09-17T00:00:00Z'),
 (-917024, 'Luossavaara-Kiirunavaara AB (LKAB)', 'SE', '2026-09-17T00:00:00Z'),
 (-917025, 'Sandvik AB', 'SE', '2026-09-17T00:00:00Z'),
 (-917026, 'Suncor Energy Inc.', 'CA', '2026-09-17T00:00:00Z');

CREATE TEMP TABLE seed_region ON COMMIT DROP AS SELECT * FROM public.region WITH NO DATA;

INSERT INTO seed_region (id, name, country_code) VALUES
 (-917001, 'Inner Mongolia Autonomous Region', 'CN'),
 (-917002, 'Shanxi Province', 'CN'),
 (-917007, 'Western Australia', 'AU'),
 (-917008, 'Norrbotten County', 'SE'),
 (-917009, 'Alberta', 'CA');

CREATE TEMP TABLE seed_site ON COMMIT DROP AS SELECT * FROM public.site WITH NO DATA;

-- Approximate administrative-centre points for development maps, not mine locations.
INSERT INTO seed_site (id, name, country_code, region_id, commodity, mine_status, point_4326) VALUES
 (-917001, 'Nan (South) Opencast Coal Mine', 'CN', -917001, 'Coal', 'operating', ST_SetSRID(ST_MakePoint(122.243, 43.654), 4326)),
 (-917002, 'Anjialing Opencast Coal Mine', 'CN', -917002, 'Coal', 'operating', ST_SetSRID(ST_MakePoint(112.4329, 39.3317), 4326)),
 (-917003, 'Heidaigou Opencast Coal Mine', 'CN', -917001, 'Coal', 'operating', ST_SetSRID(ST_MakePoint(109.791, 39.597), 4326)),
 (-917010, 'Gudai-Darri Mine', 'AU', -917007, 'Iron ore', 'operating', ST_SetSRID(ST_MakePoint(119.732, -23.354), 4326)),
 (-917011, 'South Flank Mine', 'AU', -917007, 'Iron ore', 'operating', ST_SetSRID(ST_MakePoint(119.732, -23.354), 4326)),
 (-917012, 'Solomon Kings Mine', 'AU', -917007, 'Iron ore', 'operating', ST_SetSRID(ST_MakePoint(117.795, -22.69389), 4326)),
 (-917013, 'Kiruna Mine', 'SE', -917008, 'Iron ore', 'operating', ST_SetSRID(ST_MakePoint(20.30278, 67.84889), 4326)),
 (-917014, 'Fort Hills Mine', 'CA', -917009, 'Oil sands (bitumen)', 'operating', ST_SetSRID(ST_MakePoint(-111.38028, 56.72639), 4326)),
 (-917015, 'Yandicoogina Mine', 'AU', -917007, 'Iron ore', 'operating', ST_SetSRID(ST_MakePoint(119.732, -23.354), 4326));

CREATE TEMP TABLE seed_site_company_role ON COMMIT DROP AS SELECT * FROM public.site_company_role WITH NO DATA;

INSERT INTO seed_site_company_role (id, site_id, company_id, role) VALUES
 (-917001, -917001, -917008, 'owner'),
 (-917002, -917001, -917002, 'contractor'),
 (-917003, -917002, -917010, 'owner'),
 (-917004, -917003, -917009, 'owner'),
 (-917005, -917003, -917007, 'contractor'),
 (-917006, -917010, -917021, 'owner'),
 (-917007, -917010, -917015, 'contractor'),
 (-917008, -917011, -917022, 'owner'),
 (-917009, -917011, -917016, 'contractor'),
 (-917010, -917012, -917023, 'owner'),
 (-917011, -917012, -917015, 'contractor'),
 (-917012, -917013, -917024, 'owner'),
 (-917013, -917013, -917019, 'contractor'),
 (-917014, -917013, -917025, 'contractor'),
 (-917015, -917014, -917026, 'owner'),
 (-917016, -917014, -917016, 'contractor'),
 (-917017, -917015, -917021, 'owner'),
 (-917018, -917015, -917016, 'contractor');

CREATE TEMP TABLE seed_machine_model ON COMMIT DROP AS SELECT * FROM public.machine_model WITH NO DATA;

INSERT INTO seed_machine_model (id, manufacturer_id, model_name, machine_type, size_class, max_payload_tonnes, operating_weight_tonnes) VALUES
 (-917003, -917002, 'AT150', 'haul_truck', 'All-electric bidirectional wide-body mining dump truck', NULL, NULL),
 (-917004, -917002, NULL, 'haul_truck', '300-tonne-class mining dump truck', 300, NULL),
 (-917006, -917004, 'XEG220E', 'haul_truck', 'All-electric AC-drive wheel-motor dump truck', 200, NULL),
 (-917007, -917004, 'XEG120E', 'haul_truck', 'All-electric AC-drive wheel-motor dump truck', 120, NULL),
 (-917008, -917015, '793F', 'haul_truck', 'Diesel-mechanical rigid-frame ultra-class haul truck', 240, 404),
 (-917009, -917016, '930E-5', 'haul_truck', 'AC electric-drive rigid-frame ultra-class haul truck', 304, 522),
 (-917010, -917018, 'T 264', 'haul_truck', 'AC electric-drive rigid-frame mining truck', 240, NULL),
 (-917011, -917017, 'EH5000AC-3', 'haul_truck', 'AC electric-drive rigid dump truck', 296, 500),
 (-917012, -917019, 'Scooptram ST18', 'lhd', 'Diesel underground load-haul-dump loader (LHD), automation-ready', 17.5, NULL),
 (-917013, -917016, '980E-5', 'haul_truck', 'AC electric-drive rigid-frame ultra-class haul truck', 363, 628),
 (-917014, -917025, 'Toro LH625iE', 'lhd', 'Cable-electric underground load-haul-dump loader (LHD), automation-ready', 25, NULL);

CREATE TEMP TABLE seed_technology_product ON COMMIT DROP AS SELECT * FROM public.technology_product WITH NO DATA;

INSERT INTO seed_technology_product (id, supplier_id, product_name, vendor_term, automation_level, level_basis) VALUES
 (-917003, -917007, 'Autonomous Production & Haulage Control System', 'WAYTOUS', 'autonomous', 'Zhunneng Group''s Heidaigou / Haerwusu opencast coal mines have completed autonomy retrofits on 103 trucks in total; as of October 2025 roughly 40 are in routine daily operation.'),
 (-917004, -917002, 'Bidirectional Autonomous-Driving Decision System', NULL, 'autonomous', 'China''s first hundred-tonne-class all-electric bidirectional autonomous mining dump truck, achieving a full closed loop of automatic loading, autonomous driving, precision dumping, autonomous obstacle avoidance and automatic parking with no human driver.'),
 (-917005, -917015, 'Cat MineStar Command for Hauling', 'MineStar Command', 'autonomous', '8 autonomous Cat 793F CMD trucks began operating at Fortescue''s Solomon Kings mine in October 2013 (Caterpillar''s first project of this kind, planned to expand to 45); 26 autonomous Cat 793F trucks were operating at Rio Tinto''s Gudai-Darri mine as of October 2023.'),
 (-917006, -917016, 'FrontRunner Autonomous Haulage System (AHS)', 'FrontRunner', 'autonomous', 'BHP''s South Flank iron-ore mine completed conversion of its full fleet of 41 Komatsu 930E-5 trucks to autonomous operation by June 2023.'),
 (-917007, -917020, 'DISPATCH Fleet Management System', 'DISPATCH', NULL, 'Wholly owned Komatsu subsidiary since 2003; DISPATCH provides fleet optimization and reporting, and Modular also contributes supervisory-system, communications and vehicle-interaction-safety components to Komatsu-affiliated autonomous haulage systems.'),
 (-917008, -917019, 'Scooptram Automation (autonomous loading system for Scooptram ST18)', NULL, 'autonomous', 'LKAB''s Kiruna mine operates 3 automated Scooptram ST18 loaders (as of April 2022), running autonomously approximately 90% of the time under remote supervision.'),
 (-917009, -917025, 'Automated Loading System for Toro LH625iE', 'AutoMine', 'autonomous', 'LKAB''s Kiruna mine grew its automated Sandvik Toro LH625iE electric-loader fleet to 20 units by December 2023.');

CREATE TEMP TABLE seed_deployment ON COMMIT DROP AS SELECT * FROM public.deployment WITH NO DATA;

INSERT INTO seed_deployment (id, site_id, machine_model_id, technology_product_id, quantity, environment, commissioning_date, status, verification_status, valid_from, valid_to, created_at, updated_at) VALUES
 (-917001, -917001, -917003, -917004, 1, 'surface', '2026-07-30', 'operational', 'unverified', '2026-07-30', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917002, -917002, -917006, NULL, 1, 'surface', '2024-10-11', 'operational', 'unverified', '2024-10-11', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917003, -917002, -917007, NULL, 16, 'surface', NULL, 'announced', 'unverified', NULL, NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917004, -917003, -917004, -917003, 103, 'surface', NULL, 'operational', 'unverified', '2021-08-01', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917005, -917010, -917008, -917005, 26, 'surface', NULL, 'operational', 'unverified', NULL, NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917006, -917011, -917009, -917006, 41, 'surface', '2023-06-13', 'operational', 'unverified', '2023-06-13', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917007, -917012, -917008, -917005, 8, 'surface', '2013-10-01', 'operational', 'unverified', '2013-10-01', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917008, -917013, -917012, -917008, 3, 'underground', '2022-04-05', 'operational', 'unverified', '2022-04-05', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917009, -917013, -917014, -917009, 20, 'underground', '2023-12-11', 'operational', 'unverified', '2023-12-11', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917010, -917014, -917013, -917006, 47, 'surface', NULL, 'operational', 'unverified', NULL, NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'),
 (-917011, -917015, -917009, -917006, 22, 'surface', '2015-10-18', 'operational', 'unverified', '2015-10-18', NULL, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');

LOCK TABLE public.company, public.region, public.site, public.site_company_role, public.machine_model, public.technology_product, public.deployment IN SHARE ROW EXCLUSIVE MODE;


-- Upgrade only unchanged legacy seed sites whose coordinates are still NULL.
UPDATE public.site d
SET point_4326 = s.point_4326
FROM seed_site s
WHERE d.id = s.id
  AND d.point_4326 IS NULL
  AND (to_jsonb(d) - 'point_4326') = (to_jsonb(s) - 'point_4326');

DO $$
DECLARE t text; bad boolean;
BEGIN
 FOREACH t IN ARRAY ARRAY['company','region','site','site_company_role',
  'machine_model','technology_product','deployment'] LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I d JOIN seed_%I s USING(id)
   WHERE to_jsonb(d) IS DISTINCT FROM to_jsonb(s))',t,t) INTO bad;
  IF bad THEN RAISE EXCEPTION 'Existing seed record differs in %. No changes applied.',t; END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I d WHERE id BETWEEN -917099 AND -917001
   AND NOT EXISTS(SELECT 1 FROM seed_%I s WHERE s.id=d.id))',t,t) INTO bad;
  IF bad THEN RAISE EXCEPTION 'Reserved seed ID conflict in %',t; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.site d JOIN seed_site s ON d.name=s.name
  AND d.country_code=s.country_code WHERE d.id<>s.id)
 THEN RAISE EXCEPTION 'Existing site uses another ID. Reconcile before importing.'; END IF;
END $$;

INSERT INTO public.company (id, name, country_code, created_at)
SELECT s.id, s.name, s.country_code, s.created_at FROM seed_company s
WHERE NOT EXISTS(SELECT 1 FROM public.company d WHERE d.id=s.id);

INSERT INTO public.region (id, name, country_code)
SELECT s.id, s.name, s.country_code FROM seed_region s
WHERE NOT EXISTS(SELECT 1 FROM public.region d WHERE d.id=s.id);

INSERT INTO public.site (id, name, country_code, region_id, commodity, mine_status, point_4326)
SELECT s.id, s.name, s.country_code, s.region_id, s.commodity, s.mine_status, s.point_4326 FROM seed_site s
WHERE NOT EXISTS(SELECT 1 FROM public.site d WHERE d.id=s.id);

INSERT INTO public.site_company_role (id, site_id, company_id, role)
SELECT s.id, s.site_id, s.company_id, s.role FROM seed_site_company_role s
WHERE NOT EXISTS(SELECT 1 FROM public.site_company_role d WHERE d.id=s.id);

INSERT INTO public.machine_model (id, manufacturer_id, model_name, machine_type, size_class, max_payload_tonnes, operating_weight_tonnes)
SELECT s.id, s.manufacturer_id, s.model_name, s.machine_type, s.size_class, s.max_payload_tonnes, s.operating_weight_tonnes FROM seed_machine_model s
WHERE NOT EXISTS(SELECT 1 FROM public.machine_model d WHERE d.id=s.id);

INSERT INTO public.technology_product (id, supplier_id, product_name, vendor_term, automation_level, level_basis)
SELECT s.id, s.supplier_id, s.product_name, s.vendor_term, s.automation_level, s.level_basis FROM seed_technology_product s
WHERE NOT EXISTS(SELECT 1 FROM public.technology_product d WHERE d.id=s.id);

INSERT INTO public.deployment (id, site_id, machine_model_id, technology_product_id, quantity, environment, commissioning_date, status, verification_status, valid_from, valid_to, created_at, updated_at)
SELECT s.id, s.site_id, s.machine_model_id, s.technology_product_id, s.quantity, s.environment, s.commissioning_date, s.status, s.verification_status, s.valid_from, s.valid_to, s.created_at, s.updated_at FROM seed_deployment s
WHERE NOT EXISTS(SELECT 1 FROM public.deployment d WHERE d.id=s.id);

DO $$
DECLARE t text; bad boolean;
BEGIN
 FOREACH t IN ARRAY ARRAY['company','region','site','site_company_role',
  'machine_model','technology_product','deployment'] LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM seed_%I s LEFT JOIN public.%I d USING(id)
   WHERE d.id IS NULL OR to_jsonb(d) IS DISTINCT FROM to_jsonb(s))',t,t) INTO bad;
  IF bad THEN RAISE EXCEPTION 'Seed validation failed in %',t; END IF;
 END LOOP;
END $$;
COMMIT;

SELECT 'company' AS seed_table, count(*) AS rows FROM public.company WHERE id BETWEEN -917099 AND -917001
UNION ALL
SELECT 'region' AS seed_table, count(*) AS rows FROM public.region WHERE id BETWEEN -917099 AND -917001
UNION ALL
SELECT 'site' AS seed_table, count(*) AS rows FROM public.site WHERE id BETWEEN -917099 AND -917001
UNION ALL
SELECT 'site_company_role' AS seed_table, count(*) AS rows FROM public.site_company_role WHERE id BETWEEN -917099 AND -917001
UNION ALL
SELECT 'machine_model' AS seed_table, count(*) AS rows FROM public.machine_model WHERE id BETWEEN -917099 AND -917001
UNION ALL
SELECT 'technology_product' AS seed_table, count(*) AS rows FROM public.technology_product WHERE id BETWEEN -917099 AND -917001
UNION ALL
SELECT 'deployment' AS seed_table, count(*) AS rows FROM public.deployment WHERE id BETWEEN -917099 AND -917001;

SELECT count(*) AS sites_with_coordinates,
       count(DISTINCT ST_AsEWKB(point_4326)) AS distinct_map_points
FROM public.site WHERE id BETWEEN -917099 AND -917001
AND point_4326 IS NOT NULL;
