-- Bounded work for every connection to this database. A runaway query, or a
-- transaction left open by a frozen serverless function, is ended by the server
-- instead of holding a connection and its row locks until the platform gives up.
--
-- Set on the database rather than as connection parameters, so it applies
-- whichever endpoint the API connects through: a connection pooler such as
-- Neon's may refuse these as startup parameters. Migrations lift the statement
-- limit for their own session (src/migrate.ts), as an index build may run longer.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET statement_timeout = %L', current_database(), '15s');
  EXECUTE format('ALTER DATABASE %I SET idle_in_transaction_session_timeout = %L', current_database(), '60s');
END
$$;
