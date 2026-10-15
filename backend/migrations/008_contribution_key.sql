-- A private key per submission lets its contributor follow and update it
-- without an account (#205, SRS v0.7 FR-59). Only a SHA-256 hash is stored,
-- as 64 lowercase hex characters. A record without a row here, such as a
-- record loaded without review, is never reachable through the contributor
-- API. The key lives in its own table so that public reads of deployment
-- never carry it.
CREATE TABLE contribution_key (
  deployment_id BIGINT PRIMARY KEY REFERENCES deployment (id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL CONSTRAINT contribution_key_hash_format CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
