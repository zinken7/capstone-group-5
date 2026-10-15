-- A private key per proposed correction lets its proposer follow it without
-- an account, as contribution_key does for submissions (#223, SRS FR-59).
-- Only a SHA-256 hash is stored. Numbered 011 after 010 (#221); the runner
-- applies pending files in name order.
CREATE TABLE correction_key (
  correction_id BIGINT PRIMARY KEY REFERENCES deployment_correction (id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL CONSTRAINT correction_key_hash_format CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
