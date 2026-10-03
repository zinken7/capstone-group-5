import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

/**
 * Alias groups for retrieval's query expansion: each group is every surface
 * form of one entity, canonical name first. alias-groups.json is a committed
 * snapshot of the seed's company and site aliases (seed-spec §3), so the
 * harness has no dependency on another branch or a database; regenerate it
 * when the seed aliases change, and replace it with the alias tables once
 * migration 002 provides them.
 */
export function loadAliasGroups(): string[][] {
  const path = fileURLToPath(new URL('./alias-groups.json', import.meta.url))
  return z.array(z.array(z.string().min(1)).min(2)).parse(JSON.parse(readFileSync(path, 'utf8')))
}
