import { defineConfig } from 'drizzle-kit'

// drizzle-kit is used for introspection (pull) only. The SQL files in
// migrations/ remain the single migration authority; drizzle-kit migrations
// are never generated or applied (see README, "Data access").
//
// DRIZZLE_OUT keeps pull output away from the committed schema: the committed
// src/db/schema.ts and src/db/relations.ts are produced by
// `npm run db:schema:update`, which pulls from a freshly migrated scratch
// database and copies only those two files into src/db/.
export default defineConfig({
  dialect: 'postgresql',
  out: process.env.DRIZZLE_OUT ?? './.drizzle-pull',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // PostGIS system tables (spatial_ref_sys, …) are not part of our model.
  extensionsFilters: ['postgis'],
  // schema_migrations belongs to the migration runner, not to feature code.
  tablesFilter: ['!schema_migrations'],
})
