import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { validateCorrection } = await import('../lib/correction-validation.js')
const { correctDeployment } = await import('./corrections.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

function input(body: Record<string, unknown>) {
  const result = validateCorrection({ disclosure_accepted: true, ...body })
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.value
}

async function deployment10() {
  const [row] = await query<{ quantity: number; verification_status: string }>(
    'SELECT quantity, verification_status::text FROM deployment WHERE id = 10',
  )
  return row
}

describe('correctDeployment', () => {
  it('rolls back the revision, contributor and evidence when the update fails', async () => {
    const correction = input({
      quantity: 5,
      evidence_urls: ['https://example.com/new'],
      contributor_email: 'analyst@example.com',
      change_note: 'Fleet reduced',
    })

    // Bypasses validation so the deployment CHECK (quantity > 0) fails after the contributor and revision inserts
    await expect(correctDeployment(10, { ...correction, changes: { quantity: 0 } })).rejects.toThrow('deployment_quantity_check')

    expect(await deployment10()).toEqual({ quantity: 96, verification_status: 'verified' })
    expect(await query('SELECT id FROM revision WHERE deployment_id = 10')).toEqual([])
    expect(await query('SELECT id FROM contributor')).toEqual([])
    expect(await query('SELECT url FROM evidence WHERE deployment_id = 10')).toEqual([{ url: 'https://example.com/evidence/10' }])
  })
})
