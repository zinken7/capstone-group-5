-- Administrator roles and temporary passwords (#66, #100).
-- root accounts are created only with `npm run admin:create -- --root` and
-- manage administrator accounts; admin accounts review submissions.
-- No BEGIN/COMMIT: the migration runner wraps this file in one transaction.

CREATE TYPE admin_role AS ENUM ('root', 'admin');

ALTER TABLE admin_user
  ADD COLUMN role admin_role NOT NULL DEFAULT 'admin',
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN admin_user.must_change_password IS
  'True while the account still has a generated temporary password; every other admin action is refused until it is changed.';
