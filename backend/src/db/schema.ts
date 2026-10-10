import { pgTable, unique, bigint, text, index, foreignKey, geometry, timestamp, check, integer, date, smallint, boolean, jsonb, uniqueIndex, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const adminRole = pgEnum("admin_role", ['root', 'admin'])
export const automationLevel = pgEnum("automation_level", ['operator_assistance', 'teleremote', 'semi_autonomous', 'autonomous'])
export const companyRole = pgEnum("company_role", ['owner', 'operator', 'contractor'])
export const correctionStatus = pgEnum("correction_status", ['pending', 'approved', 'rejected', 'needs_changes'])
export const deploymentStatus = pgEnum("deployment_status", ['announced', 'commissioning', 'operational', 'decommissioned'])
export const evidenceType = pgEnum("evidence_type", ['company_release', 'news', 'academic', 'government', 'report', 'other'])
export const installationType = pgEnum("installation_type", ['factory_installed', 'retrofit', 'unknown'])
export const machineType = pgEnum("machine_type", ['haul_truck', 'lhd', 'loader', 'dozer', 'excavator', 'drill', 'scaler', 'shotcrete_machine', 'underground_haul_truck', 'water_truck', 'wheel_loader', 'crawler_loader', 'rock_breaker', 'skid_steer', 'strut_handler', 'shovel', 'other'])
export const miningEnvironment = pgEnum("mining_environment", ['surface', 'underground', 'both'])
export const revisionAction = pgEnum("revision_action", ['create', 'update', 'verification_change'])
export const siteStatus = pgEnum("site_status", ['operating', 'commissioning'])
export const verificationDecision = pgEnum("verification_decision", ['approved', 'rejected', 'needs_changes'])
export const verificationStatus = pgEnum("verification_status", ['unverified', 'pending_review', 'verified', 'rejected'])


export const region = pgTable("region", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "region_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: text().notNull(),
	countryCode: text("country_code").notNull(),
}, (table) => [
	unique("region_id_country_code_key").on(table.id, table.countryCode),
	unique("region_name_country_code_key").on(table.name, table.countryCode),
]);

export const site = pgTable("site", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "site_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: text().notNull(),
	countryCode: text("country_code").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	regionId: bigint("region_id", { mode: "number" }),
	commodity: text(),
	mineStatus: siteStatus("mine_status"),
	point4326: geometry("point_4326", { type: "point", srid: 4326 }),
}, (table) => [
	index("site_country_code_idx").using("btree", table.countryCode.asc().nullsLast().op("text_ops")),
	index("site_point_4326_gist_idx").using("gist", table.point4326.asc().nullsLast().op("gist_geometry_ops_2d")),
	index("site_region_id_idx").using("btree", table.regionId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.countryCode, table.regionId],
			foreignColumns: [region.countryCode, region.id],
			name: "site_region_same_country_fkey"
		}),
]);

export const siteCompanyRole = pgTable("site_company_role", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "site_company_role_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	siteId: bigint("site_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	companyId: bigint("company_id", { mode: "number" }).notNull(),
	role: companyRole().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [site.id],
			name: "site_company_role_site_id_fkey"
		}),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [company.id],
			name: "site_company_role_company_id_fkey"
		}),
	unique("site_company_role_site_id_company_id_role_key").on(table.siteId, table.companyId, table.role),
]);

export const company = pgTable("company", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "company_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: text().notNull(),
	countryCode: text("country_code"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("company_name_key").on(table.name),
]);

export const deployment = pgTable("deployment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "deployment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	siteId: bigint("site_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	machineModelId: bigint("machine_model_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	technologyProductId: bigint("technology_product_id", { mode: "number" }),
	quantity: integer().notNull(),
	environment: miningEnvironment(),
	commissioningDate: date("commissioning_date"),
	status: deploymentStatus(),
	verificationStatus: verificationStatus("verification_status").default('unverified').notNull(),
	validFrom: date("valid_from"),
	validTo: date("valid_to"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	automationLevel: automationLevel("automation_level").notNull(),
	installationType: installationType("installation_type").default('unknown').notNull(),
	commissioningYear: smallint("commissioning_year"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	technologySupplierId: bigint("technology_supplier_id", { mode: "number" }).notNull(),
}, (table) => [
	index("deployment_automation_level_idx").using("btree", table.automationLevel.asc().nullsLast().op("enum_ops")),
	index("deployment_commissioning_date_idx").using("btree", table.commissioningDate.asc().nullsLast().op("date_ops")),
	index("deployment_commissioning_year_idx").using("btree", table.commissioningYear.asc().nullsLast().op("int2_ops")),
	index("deployment_installation_type_idx").using("btree", table.installationType.asc().nullsLast().op("enum_ops")),
	index("deployment_machine_model_id_idx").using("btree", table.machineModelId.asc().nullsLast().op("int8_ops")),
	index("deployment_site_id_idx").using("btree", table.siteId.asc().nullsLast().op("int8_ops")),
	index("deployment_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("deployment_technology_product_id_idx").using("btree", table.technologyProductId.asc().nullsLast().op("int8_ops")),
	index("deployment_technology_supplier_id_idx").using("btree", table.technologySupplierId.asc().nullsLast().op("int8_ops")),
	index("deployment_verification_status_idx").using("btree", table.verificationStatus.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [site.id],
			name: "deployment_site_id_fkey"
		}),
	foreignKey({
			columns: [table.machineModelId],
			foreignColumns: [machineModel.id],
			name: "deployment_machine_model_id_fkey"
		}),
	foreignKey({
			columns: [table.technologyProductId],
			foreignColumns: [technologyProduct.id],
			name: "deployment_technology_product_id_fkey"
		}),
	foreignKey({
			columns: [table.technologySupplierId],
			foreignColumns: [company.id],
			name: "deployment_technology_supplier_id_fkey"
		}),
	foreignKey({
			columns: [table.technologyProductId, table.technologySupplierId],
			foreignColumns: [technologyProduct.id, technologyProduct.supplierId],
			name: "deployment_product_same_supplier_fkey"
		}),
	check("deployment_quantity_check", sql`quantity > 0`),
	check("deployment_validity_ordered", sql`(valid_to IS NULL) OR (valid_from IS NULL) OR (valid_to >= valid_from)`),
	check("deployment_commissioning_precision", sql`(commissioning_date IS NULL) OR ((commissioning_year IS NOT NULL) AND ((commissioning_year)::numeric = EXTRACT(year FROM commissioning_date)))`),
]);

export const technologyProduct = pgTable("technology_product", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "technology_product_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	supplierId: bigint("supplier_id", { mode: "number" }).notNull(),
	productName: text("product_name").notNull(),
	vendorTerm: text("vendor_term"),
	automationLevel: automationLevel("automation_level"),
	levelBasis: text("level_basis"),
}, (table) => [
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [company.id],
			name: "technology_product_supplier_id_fkey"
		}),
	unique("technology_product_id_supplier_unique").on(table.id, table.supplierId),
	unique("technology_product_supplier_product_unique").on(table.supplierId, table.productName),
]);

export const adminUser = pgTable("admin_user", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "admin_user_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	role: adminRole().default('admin').notNull(),
	mustChangePassword: boolean("must_change_password").default(false).notNull(),
}, (table) => [
	unique("admin_user_email_key").on(table.email),
	check("admin_user_password_hash_check", sql`btrim(password_hash) <> ''::text`),
]);

export const verificationReview = pgTable("verification_review", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "verification_review_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deploymentId: bigint("deployment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	adminUserId: bigint("admin_user_id", { mode: "number" }).notNull(),
	decision: verificationDecision().notNull(),
	reviewNote: text("review_note"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	correctionId: bigint("correction_id", { mode: "number" }),
}, (table) => [
	index("verification_review_admin_user_idx").using("btree", table.adminUserId.asc().nullsLast().op("int8_ops")),
	index("verification_review_correction_idx").using("btree", table.correctionId.asc().nullsLast().op("int8_ops")).where(sql`(correction_id IS NOT NULL)`),
	index("verification_review_deployment_reviewed_idx").using("btree", table.deploymentId.asc().nullsLast().op("int8_ops"), table.reviewedAt.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.deploymentId],
			foreignColumns: [deployment.id],
			name: "verification_review_deployment_id_fkey"
		}),
	foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [adminUser.id],
			name: "verification_review_admin_user_id_fkey"
		}),
	foreignKey({
			columns: [table.deploymentId, table.correctionId],
			foreignColumns: [deploymentCorrection.deploymentId, deploymentCorrection.id],
			name: "verification_review_correction_same_deployment_fkey"
		}),
]);

export const revision = pgTable("revision", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "revision_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deploymentId: bigint("deployment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contributorId: bigint("contributor_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	adminUserId: bigint("admin_user_id", { mode: "number" }),
	action: revisionAction().notNull(),
	previousValues: jsonb("previous_values"),
	changeNote: text("change_note"),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("revision_deployment_changed_idx").using("btree", table.deploymentId.asc().nullsLast().op("int8_ops"), table.changedAt.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.deploymentId],
			foreignColumns: [deployment.id],
			name: "revision_deployment_id_fkey"
		}),
	foreignKey({
			columns: [table.contributorId],
			foreignColumns: [contributor.id],
			name: "revision_contributor_id_fkey"
		}),
	foreignKey({
			columns: [table.adminUserId],
			foreignColumns: [adminUser.id],
			name: "revision_admin_user_id_fkey"
		}),
	check("revision_exactly_one_actor", sql`(contributor_id IS NOT NULL) <> (admin_user_id IS NOT NULL)`),
]);

export const contributor = pgTable("contributor", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "contributor_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	displayName: text("display_name"),
	email: text(),
	organisation: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const machineModel = pgTable("machine_model", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "machine_model_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	manufacturerId: bigint("manufacturer_id", { mode: "number" }).notNull(),
	modelName: text("model_name"),
	machineType: machineType("machine_type").notNull(),
	sizeClass: text("size_class"),
	maxPayloadTonnes: numeric("max_payload_tonnes"),
	operatingWeightTonnes: numeric("operating_weight_tonnes"),
	modelVariant: text("model_variant"),
}, (table) => [
	uniqueIndex("machine_model_manufacturer_model_variant_unique").using("btree", sql`manufacturer_id`, sql`model_name`, sql`COALESCE(lower(model_variant), ''::text)`).where(sql`(model_name IS NOT NULL)`),
	uniqueIndex("machine_model_manufacturer_type_variant_unnamed_unique").using("btree", sql`manufacturer_id`, sql`machine_type`, sql`COALESCE(lower(model_variant), ''::text)`).where(sql`(model_name IS NULL)`),
	foreignKey({
			columns: [table.manufacturerId],
			foreignColumns: [company.id],
			name: "machine_model_manufacturer_id_fkey"
		}),
	check("machine_model_max_payload_tonnes_check", sql`max_payload_tonnes > (0)::numeric`),
	check("machine_model_operating_weight_tonnes_check", sql`operating_weight_tonnes > (0)::numeric`),
	check("machine_model_variant_normalised", sql`(model_variant IS NULL) OR ((model_variant = btrim(model_variant)) AND (model_variant <> ''::text))`),
]);

export const evidence = pgTable("evidence", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "evidence_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deploymentId: bigint("deployment_id", { mode: "number" }).notNull(),
	url: text().notNull(),
	sourceType: evidenceType("source_type").notNull(),
	publisher: text(),
	publishedDate: date("published_date"),
}, (table) => [
	foreignKey({
			columns: [table.deploymentId],
			foreignColumns: [deployment.id],
			name: "evidence_deployment_id_fkey"
		}),
	unique("evidence_deployment_url_unique").on(table.deploymentId, table.url),
	check("evidence_url_check", sql`btrim(url) <> ''::text`),
]);

export const deploymentCorrection = pgTable("deployment_correction", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "deployment_correction_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deploymentId: bigint("deployment_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contributorId: bigint("contributor_id", { mode: "number" }),
	proposedValues: jsonb("proposed_values").notNull(),
	baseValues: jsonb("base_values").notNull(),
	evidenceUrls: text("evidence_urls").array().notNull(),
	changeNote: text("change_note"),
	status: correctionStatus().default('pending').notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("deployment_correction_deployment_idx").using("btree", table.deploymentId.asc().nullsLast().op("int8_ops"), table.submittedAt.asc().nullsLast().op("timestamptz_ops")),
	index("deployment_correction_pending_idx").using("btree", table.submittedAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(status = 'pending'::correction_status)`),
	foreignKey({
			columns: [table.deploymentId],
			foreignColumns: [deployment.id],
			name: "deployment_correction_deployment_id_fkey"
		}),
	foreignKey({
			columns: [table.contributorId],
			foreignColumns: [contributor.id],
			name: "deployment_correction_contributor_id_fkey"
		}),
	unique("deployment_correction_id_deployment_unique").on(table.id, table.deploymentId),
	check("deployment_correction_values_are_objects", sql`(jsonb_typeof(proposed_values) = 'object'::text) AND (jsonb_typeof(base_values) = 'object'::text)`),
	check("deployment_correction_changes_something", sql`(proposed_values <> '{}'::jsonb) OR (cardinality(evidence_urls) > 0)`),
]);
