import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

/**
 * timestamptz exactly as the API has always serialised it: pg handed res.json
 * a Date, which became ISO 8601 UTC with milliseconds. Drizzle returns the
 * column as PostgreSQL text instead, so the formatting moves into SQL.
 */
export function isoTimestamp(column: AnyPgColumn) {
  return sql<string>`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
}
