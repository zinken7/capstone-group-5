-- Align the core model with docs/database/ERD.md and SRS v0.6 (#171).
-- Apply after 001-004. No BEGIN/COMMIT: the migration runner must wrap this
-- entire file in one transaction, as it does for the earlier migrations.
-- Existing product metadata and contribution/review tables are retained.
SET LOCAL search_path = public, pg_catalog;

-- Keep the preflight and backfill stable while constraints are installed.
LOCK TABLE company, technology_product, deployment, revision
  IN ACCESS EXCLUSIVE MODE;

-- A named product is the only existing source from which the supplier can
-- be recovered. Do not invent suppliers, deployment levels or audit actors.
-- Resolve any reported rows from real source information before retrying.
DO $$
DECLARE
  missing_supplier_count BIGINT;
  missing_level_count BIGINT;
  invalid_actor_count BIGINT;
BEGIN
  SELECT COUNT(*) FILTER (WHERE technology_product_id IS NULL),
         COUNT(*) FILTER (WHERE automation_level IS NULL)
    INTO missing_supplier_count, missing_level_count
    FROM deployment;

  SELECT COUNT(*) INTO invalid_actor_count
    FROM revision
    WHERE NOT ((contributor_id IS NOT NULL) <> (admin_user_id IS NOT NULL));

  IF missing_supplier_count > 0 OR missing_level_count > 0
     OR invalid_actor_count > 0 THEN
    RAISE EXCEPTION
      'SRS v0.6 migration blocked: % deployments without a recoverable supplier, % without an automation level, % revisions without exactly one actor.',
      missing_supplier_count, missing_level_count, invalid_actor_count
      USING HINT = 'Inspect deployments with technology_product_id or automation_level NULL and revisions with both actor fields NULL or both populated. Correct these through an authorised data repair; this migration does not rewrite audit history.';
  END IF;
END;
$$;

ALTER TABLE deployment
  ADD COLUMN technology_supplier_id BIGINT;

-- This technical backfill must not change business edit timestamps. Run the
-- existing evidence check immediately to avoid queued trigger events before
-- ALTER TABLE; its original deferred behaviour is restored afterwards.
SET CONSTRAINTS deployment_verified_evidence IMMEDIATE;
ALTER TABLE deployment DISABLE TRIGGER deployment_set_updated_at;

UPDATE deployment AS d
  SET technology_supplier_id = p.supplier_id
  FROM technology_product AS p
  WHERE p.id = d.technology_product_id;

ALTER TABLE deployment ENABLE TRIGGER deployment_set_updated_at;
SET CONSTRAINTS deployment_verified_evidence DEFERRED;

-- A composite target lets the database keep a named product and its supplier
-- consistent, including when a product's supplier is subsequently changed.
ALTER TABLE technology_product
  ADD CONSTRAINT technology_product_id_supplier_unique
    UNIQUE (id, supplier_id);

ALTER TABLE deployment
  ALTER COLUMN technology_supplier_id SET NOT NULL,
  ALTER COLUMN automation_level SET NOT NULL,
  ADD CONSTRAINT deployment_technology_supplier_id_fkey
    FOREIGN KEY (technology_supplier_id) REFERENCES company(id),
  ADD CONSTRAINT deployment_product_same_supplier_fkey
    FOREIGN KEY (technology_product_id, technology_supplier_id)
    REFERENCES technology_product(id, supplier_id),
  DROP CONSTRAINT deployment_verified_requires_technology_product;

-- Product remains optional, including on verified records. The existing
-- deferred evidence constraints still require evidence for verification.
CREATE INDEX deployment_technology_supplier_id_idx
  ON deployment(technology_supplier_id);

ALTER TABLE revision
  DROP CONSTRAINT revision_at_most_one_actor,
  ADD CONSTRAINT revision_exactly_one_actor CHECK (
    (contributor_id IS NOT NULL) <> (admin_user_id IS NOT NULL)
  );

COMMENT ON COLUMN deployment.technology_supplier_id IS
  'Required technology supplier, independently of whether a product is named. A named product must belong to this supplier.';
COMMENT ON COLUMN deployment.technology_product_id IS
  'Optional at every verification stage; when named, its supplier must match technology_supplier_id.';
COMMENT ON COLUMN deployment.automation_level IS
  'Required deployment-level classification. May be recorded without a named technology product; not inferred from product metadata.';
