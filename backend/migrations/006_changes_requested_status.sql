-- Closed review loop (#204, SRS v0.7 FR-43): a request for changes gets its
-- own status, waiting on the contributor, instead of reusing unverified,
-- which also marks records loaded without review.
-- PostgreSQL cannot use an enum value in the transaction that adds it, so
-- 007 moves the existing records once this one has committed.
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'changes_requested' AFTER 'pending_review';
