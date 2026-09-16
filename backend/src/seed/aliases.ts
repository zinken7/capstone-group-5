import type { Client } from 'pg'

import type { Alias } from './schemas.js'

export type AliasTable = 'company_alias' | 'site_alias'

export async function tableExists(client: Client, table: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>('SELECT to_regclass($1) IS NOT NULL AS exists', [table])
  return result.rows[0]?.exists ?? false
}

export interface AliasOwner {
  id: number
  aliases: readonly Alias[]
}

/**
 * Migration 001 has no alias tables. They are planned for 002 as
 * `(id, <entity>_id, alias UNIQUE, language)` (seed-spec §9), and the seed
 * files already carry the data, so aliases are written as soon as the table
 * exists. Returns the number written, or null while the table does not exist.
 * Runs inside the caller's transaction.
 */
export async function upsertAliases(client: Client, table: AliasTable, owners: readonly AliasOwner[]): Promise<number | null> {
  if (!(await tableExists(client, table))) {
    return null
  }

  const column = table === 'company_alias' ? 'company_id' : 'site_id'
  let count = 0

  for (const owner of owners) {
    for (const alias of owner.aliases) {
      await client.query(
        `INSERT INTO ${table} (${column}, alias, language) VALUES ($1, $2, $3)
         ON CONFLICT (alias) DO UPDATE SET ${column} = EXCLUDED.${column}, language = EXCLUDED.language`,
        [owner.id, alias.alias, alias.language],
      )
      count += 1
    }
  }

  return count
}
