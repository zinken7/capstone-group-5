-- A rejected submission resubmitted as a new record (#207, SRS v0.7 FR-60).
-- The rejected record stays closed; the link lets the reviewer see why the
-- earlier attempt failed, and each record's history point to the other. A
-- rejected record may be resubmitted more than once. As with
-- contribution_key, the link lives in its own table rather than a
-- deployment column.
CREATE TABLE resubmission (
  deployment_id BIGINT PRIMARY KEY REFERENCES deployment (id) ON DELETE CASCADE,
  previous_deployment_id BIGINT NOT NULL REFERENCES deployment (id),
  CONSTRAINT resubmission_not_itself CHECK (deployment_id <> previous_deployment_id)
);
CREATE INDEX resubmission_previous_deployment_id_idx ON resubmission (previous_deployment_id);
