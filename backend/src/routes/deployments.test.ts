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

async function corrections(deploymentId: number) {
  return query<{ proposed_values: Record<string, unknown>; base_values: Record<string, unknown>; evidence_urls: string[]; change_note: string | null; contributor_id: number | null; status: string }>(
    `SELECT proposed_values, base_values, evidence_urls, change_note, contributor_id::int, status::text
     FROM deployment_correction WHERE deployment_id = $1 ORDER BY id`,
    [deploymentId],
  )
}

async function stateOf(deploymentId: number) {
  const [row] = await query<{ quantity: number; verification_status: string }>(
    'SELECT quantity, verification_status::text FROM deployment WHERE id = $1',
    [deploymentId],
  )
  return row
}

describe('PATCH /api/deployments/:id', () => {
  it('stores a correction to a verified record as a proposal and leaves the record unchanged', async () => {
    const response = await request(app)
      .patch('/api/deployments/10')
      .send({ quantity: 100, change_note: 'Fleet expanded in 2025', disclosure_accepted: true })

    expect(response.status).toBe(202)
    expect(response.body).toEqual({ id: 10, correction_id: 1, verification_status: 'verified', key: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) })

    const [deployment] = await query<{ quantity: number; verification_status: string }>(
      'SELECT quantity, verification_status::text FROM deployment WHERE id = 10',
    )
    expect(deployment).toEqual({ quantity: 96, verification_status: 'verified' })
    expect(await revisions(10)).toEqual([])
    expect(await corrections(10)).toEqual([{
      proposed_values: { quantity: 100 },
      base_values: { quantity: 96 },
      evidence_urls: [],
      change_note: 'Fleet expanded in 2025',
      contributor_id: expect.any(Number),
      status: 'pending',
    }])
  })

  it('keeps the verified record in public views while its correction waits', async () => {
    await request(app).patch('/api/deployments/10').send({ quantity: 100, disclosure_accepted: true })

    const site = await request(app).get('/api/sites/1')
    expect(site.body.deployments.map((deployment: { id: number; quantity: number }) => [deployment.id, deployment.quantity])).toEqual([[10, 96], [14, 20]])
  })

  it('proposes only the fields that actually change', async () => {
    const response = await request(app)
      .patch('/api/deployments/14')
      .send({ quantity: 20, deployment_status: 'decommissioned', commissioning_date: '2014', disclosure_accepted: true })

    expect(response.status).toBe(202)
    const [correction] = await corrections(14)
    expect(correction?.proposed_values).toEqual({ commissioning_date: '2014' })
    expect(correction?.base_values).toEqual({ commissioning_date: '2015-03-01' })
  })

  it('keeps new evidence and contributor details with the proposal, not on the record', async () => {
    const response = await request(app).patch('/api/deployments/11').send({
      evidence_urls: ['https://example.com/evidence/11', 'https://example.com/new'],
      contributor_email: 'analyst@example.com',
      disclosure_accepted: true,
    })

    expect(response.status).toBe(202)
    const evidence = await query<{ url: string }>('SELECT url FROM evidence WHERE deployment_id = 11 ORDER BY id')
    expect(evidence.map((row) => row.url)).toEqual(['https://example.com/evidence/11'])

    const [correction] = await corrections(11)
    expect(correction).toMatchObject({ proposed_values: {}, base_values: {}, evidence_urls: ['https://example.com/new'] })
    expect(correction?.contributor_id).not.toBeNull()
  })

  it('refuses a correction to a record pending review and stores nothing', async () => {
    const response = await request(app)
      .patch('/api/deployments/12')
      .send({ quantity: 9, evidence_urls: ['https://example.com/new'], contributor_email: 'analyst@example.com', disclosure_accepted: true })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'only verified records can be corrected' })
    expect(await stateOf(12)).toEqual({ quantity: 8, verification_status: 'pending_review' })
    expect(await revisions(12)).toEqual([])
    expect(await corrections(12)).toEqual([])
    expect(await query('SELECT url FROM evidence WHERE deployment_id = 12')).toEqual([])
    expect(await query('SELECT id FROM contributor')).toEqual([])
  })

  it('refuses a correction to a rejected record, which stays rejected', async () => {
    await query("UPDATE deployment SET verification_status = 'rejected' WHERE id = 12")

    const response = await request(app).patch('/api/deployments/12').send({ quantity: 9, disclosure_accepted: true })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'only verified records can be corrected' })
    expect(await stateOf(12)).toEqual({ quantity: 8, verification_status: 'rejected' })
    expect(await revisions(12)).toEqual([])
  })

  it('refuses a correction to an imported unverified record, so it cannot be pushed into the review queue', async () => {
    // Loaded without review, like the seeded dataset: no submission, no revision
    await query("UPDATE deployment SET verification_status = 'unverified' WHERE id = 12")

    const response = await request(app).patch('/api/deployments/12').send({ quantity: 9, disclosure_accepted: true })

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'only verified records can be corrected' })
    expect(await stateOf(12)).toEqual({ quantity: 8, verification_status: 'unverified' })
    expect(await revisions(12)).toEqual([])
    expect(await query('SELECT id FROM contributor')).toEqual([])
  })

  it('returns 400 and writes nothing when the values match the current record', async () => {
    const response = await request(app)
      .patch('/api/deployments/10')
      .send({ quantity: 96, evidence_urls: ['https://example.com/evidence/10'], disclosure_accepted: true })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'correction does not change the record' })
    expect(await revisions(10)).toEqual([])
    expect(await corrections(10)).toEqual([])
  })

  it('returns 400 with field errors for an invalid correction', async () => {
    const response = await request(app).patch('/api/deployments/10').send({ quantity: 'many' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'invalid correction',
      fields: { quantity: 'must be a whole number between 1 and 100000', disclosure_accepted: 'must be true' },
    })
  })

  it('rejects a correction with the hidden website field filled, without saying why or storing it', async () => {
    for (const id of [10, 12]) {
      const response = await request(app)
        .patch(`/api/deployments/${id}`)
        .send({ quantity: 5, website: 'https://spam.example', disclosure_accepted: true })

      expect(response.status, String(id)).toBe(400)
      expect(response.body, String(id)).toEqual({ error: 'invalid correction' })
      expect(await corrections(id), String(id)).toEqual([])
      expect(await revisions(id), String(id)).toEqual([])
    }
    expect(await query('SELECT id::int, quantity FROM deployment WHERE id IN (10, 12) ORDER BY id')).toEqual([
      { id: 10, quantity: 96 },
      { id: 12, quantity: 8 },
    ])
  })

  it('accepts a correction with the hidden website field left empty', async () => {
    const response = await request(app).patch('/api/deployments/10').send({ quantity: 100, website: '', disclosure_accepted: true })

    expect(response.status).toBe(202)
  })

  it('returns 404 for an unknown or malformed id', async () => {
    for (const id of ['999', 'abc', '-1']) {
      const response = await request(app).patch(`/api/deployments/${id}`).send({ quantity: 5, disclosure_accepted: true })
      expect(response.status, id).toBe(404)
      expect(response.body, id).toEqual({ error: 'deployment not found' })
    }
  })
})
