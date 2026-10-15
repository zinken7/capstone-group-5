-- Keep register search and filters fast as the dataset grows (#221).
-- Numbered 010 so it does not collide with 006-009 of the review loop
-- (#204-#207); the runner applies whichever files are pending in name order,
-- and these indexes do not depend on those migrations.
-- The runner wraps each file in a transaction, so CREATE INDEX cannot be
-- CONCURRENTLY; at staging's size each index builds in milliseconds.

-- Contains-search (ILIKE '%text%') on each name table uses a trigram index;
-- pg_trgm is a supported Neon extension.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The register's default order is by site name
CREATE INDEX site_name_idx ON site (name);
CREATE INDEX site_name_trgm_idx ON site USING gin (name gin_trgm_ops);
CREATE INDEX company_name_trgm_idx ON company USING gin (name gin_trgm_ops);
CREATE INDEX technology_product_name_trgm_idx ON technology_product USING gin (product_name gin_trgm_ops);
CREATE INDEX machine_model_name_trgm_idx ON machine_model USING gin (model_name gin_trgm_ops);

-- Low-cardinality columns the filters compare as text, so the planner never
-- uses these indexes (0 scans across a full benchmark run); they only cost
-- writes. deployment_verification_status_idx stays: the moderation queue
-- filters on pending_review, which is selective.
DROP INDEX deployment_status_idx;
DROP INDEX deployment_automation_level_idx;
DROP INDEX deployment_installation_type_idx;
DROP INDEX deployment_commissioning_date_idx;
