import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

async function revisions(deploymentId: number) {
  return query<{ action: string; previous_values: Record<string, unknown>; change_note: string | null; contributor_id: number | null }>(
    'SELECT action::text, previous_values, change_note, contributor_id::int FROM revision WHERE deployment_id = $1 ORDER BY id',
    [deploymentId],
  )
}

describe('PATCH /api/deployments/:id', () => {
  it('applies a correction, keeps the previous values and returns the record to pending review', async () => {
    const response = await request(app)
      .patch('/api/deployments/10')
      .send({ quantity: 100, change_note: 'Fleet expanded in 2025', disclosure_accepted: true })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: 10, verification_status: 'pending_review' })

    const [deployment] = await query<{ quantity: number; verification_status: string }>(
      'SELECT quantity, verification_status::text FROM deployment WHERE id = 10',
    )
    expect(deployment).toEqual({ quantity: 100, verification_status: 'pending_review' })
    expect(await revisions(10)).toEqual([{
      action: 'update',
      previous_values: { quantity: 96, verification_status: 'verified' },
      change_note: 'Fleet expanded in 2025',
      contributor_id: null,
    }])
  })

  it('hides the corrected record from public views until it is reviewed again', async () => {
    await request(app).patch('/api/deployments/10').send({ quantity: 100, disclosure_accepted: true })

    const site = await request(app).get('/api/sites/1')
    expect(site.body.deployments.map((deployment: { id: number }) => deployment.id)).toEqual([14])
  })

  it('records only the fields that actually change', async () => {
    await request(app)
      .patch('/api/deployments/14')
      .send({ quantity: 20, deployment_status: 'decommissioned', commissioning_date: '2014', disclosure_accepted: true })

    const [row] = await query<{ commissioning_date: string | null; commissioning_year: number }>(
      'SELECT commissioning_date::text, commissioning_year FROM deployment WHERE id = 14',
    )
    expect(row).toEqual({ commissioning_date: null, commissioning_year: 2014 })
    expect((await revisions(14))[0]?.previous_values).toEqual({ commissioning_date: '2015-03-01', verification_status: 'verified' })
  })

  it('adds new evidence and stores contributor details', async () => {
    const response = await request(app).patch('/api/deployments/11').send({
      evidence_urls: ['https://example.com/evidence/11', 'https://example.com/new'],
      contributor_email: 'analyst@example.com',
      disclosure_accepted: true,
    })

    expect(response.status).toBe(200)
    const evidence = await query<{ url: string }>('SELECT url FROM evidence WHERE deployment_id = 11 ORDER BY id')
    expect(evidence.map((row) => row.url)).toEqual(['https://example.com/evidence/11', 'https://example.com/new'])

    const [revision] = await revisions(11)
    expect(revision?.previous_values).toEqual({ evidence_urls: ['https://example.com/evidence/11'], verification_status: 'verified' })
    expect(revision?.contributor_id).not.toBeNull()
  })

  it('returns 400 and writes nothing when the values match the current record', async () => {
    const response = await request(app)
      .patch('/api/deployments/10')
      .send({ quantity: 96, evidence_urls: ['https://example.com/evidence/10'], disclosure_accepted: true })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'correction does not change the record' })
    expect(await revisions(10)).toEqual([])
  })

  it('returns 400 with field errors for an invalid correction', async () => {
    const response = await request(app).patch('/api/deployments/10').send({ quantity: 'many' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'invalid correction',
      fields: { quantity: 'must be a whole number between 1 and 100000', disclosure_accepted: 'must be true' },
    })
  })

  it('returns 404 for an unknown or malformed id', async () => {
    for (const id of ['999', 'abc', '-1']) {
      const response = await request(app).patch(`/api/deployments/${id}`).send({ quantity: 5, disclosure_accepted: true })
      expect(response.status, id).toBe(404)
      expect(response.body, id).toEqual({ error: 'deployment not found' })
    }
  })
})
