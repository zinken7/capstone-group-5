import { asc, eq, sql } from 'drizzle-orm'

import { db } from '../database.js'
import * as tables from '../db/schema.js'

export interface TechnologyProductReference {
  supplier: string
  product: string
  automationLevel: string | null
}

/** Public product reference data used to explain and pre-fill automation levels. */
export async function listTechnologyProducts(): Promise<TechnologyProductReference[]> {
  const rows = await db
    .select({
      supplier: tables.company.name,
      product: tables.technologyProduct.productName,
      automationLevel: sql<string | null>`${tables.technologyProduct.automationLevel}::text`,
    })
    .from(tables.technologyProduct)
    .innerJoin(tables.company, eq(tables.company.id, tables.technologyProduct.supplierId))
    .orderBy(asc(tables.company.name), asc(tables.technologyProduct.productName))

  return rows
}
