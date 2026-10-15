-- Records sent back for changes before 006 were set to unverified. Only those
-- whose latest decision on the record itself is needs_changes move; records
-- loaded without review keep unverified. Decisions on proposed corrections
-- (correction_id set) never changed the record's status, so they are ignored.
-- updated_at keeps the time of that decision, which is how long the record
-- has waited for its contributor. As in 005, the evidence check runs
-- immediately so no trigger events are queued before ALTER TABLE, and its
-- deferred behaviour is restored afterwards.
SET CONSTRAINTS deployment_verified_evidence IMMEDIATE;
ALTER TABLE deployment DISABLE TRIGGER deployment_set_updated_at;

UPDATE deployment AS d
SET verification_status = 'changes_requested'
WHERE d.verification_status = 'unverified'
  AND (
    SELECT vr.decision
    FROM verification_review AS vr
    WHERE vr.deployment_id = d.id AND vr.correction_id IS NULL
    ORDER BY vr.reviewed_at DESC, vr.id DESC
    LIMIT 1
  ) = 'needs_changes';

ALTER TABLE deployment ENABLE TRIGGER deployment_set_updated_at;
SET CONSTRAINTS deployment_verified_evidence DEFERRED;
