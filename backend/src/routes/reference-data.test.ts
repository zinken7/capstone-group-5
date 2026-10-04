import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { ENUM_TYPES } = await import('../lib/controlled-values.js')

afterAll(async () => {
  await closeDatabase()
})

describe('controlled values', () => {
  it('match the PostgreSQL enums in the migrated schema', async () => {
    for (const [typeName, values] of Object.entries(ENUM_TYPES)) {
      const rows = await query<{ value: string }>(
        `
        SELECT e.enumlabel AS value
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = $1
        ORDER BY e.enumsortorder
        `,
        [typeName],
      )
      expect(rows.map((row) => row.value), typeName).toEqual([...values])
    }
  })
})

describe('GET /api/reference-data', () => {
  it('returns the controlled values used by the contribution form', async () => {
    const response = await request(app).get('/api/reference-data')

    expect(response.status).toBe(200)
    expect(response.body.automation_levels).toEqual(['operator_assistance', 'teleremote', 'semi_autonomous', 'autonomous'])
    expect(response.body.environments).toEqual(['surface', 'underground', 'both'])
    expect(response.body.installation_types).toEqual(['factory_installed', 'retrofit', 'unknown'])
    expect(response.body.deployment_statuses).toContain('operational')
    expect(response.body.machine_types).toContain('haul_truck')
  })
})
