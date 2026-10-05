import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { signedInAdmin } = await import('../test/admin.js')

let cookie: string

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
  ;({ cookie } = await signedInAdmin(app))
})

afterAll(async () => {
  await closeDatabase()
})

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/** A public correction to a verified deployment; returns the correction id. */
async function propose(deploymentId: number, body: Record<string, unknown>): Promise<number> {
  const response = await request(app).patch(`/api/deployments/${deploymentId}`).send({ disclosure_accepted: true, ...body })
  expect(response.status).toBe(202)
  return response.body.correction_id as number
}

function decide(correctionId: number | string, body: unknown) {
  return request(app)
    .post(`/api/admin/corrections/${correctionId}/reviews`)
    .set('Cookie', cookie)
    .set('X-Requested-With', 'fetch')
    .send(body as object)
}

async function deployment10() {
  const [row] = await query<{ quantity: number; verification_status: string }>(
    'SELECT quantity, verification_status::text FROM deployment WHERE id = 10',
  )
  return row
}

describe('the review queue', () => {
  it('lists proposed corrections next to submissions, with the fields they change', async () => {
    const correctionId = await propose(10, {
      quantity: 100,
      evidence_urls: ['https://example.com/fleet-2026'],
      contributor_email: 'analyst@example.com',
    })

    const response = await request(app).get('/api/admin/reviews').set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([
      expect.objectContaining({ id: 12, kind: 'submission', correction_id: null, changed_fields: [] }),
      expect.objectContaining({
        id: 10,
        kind: 'correction',
        correction_id: correctionId,
        changed_fields: ['quantity', 'evidence_urls'],
        // The record's current values, and the sources supplied with the correction
        quantity: 96,
        evidence_count: 1,
        contributor_email: 'analyst@example.com',
        contributor_organisation: null,
      }),
    ])
    expect(response.body.items[1].submitted_at).toMatch(ISO_UTC)
  })

  it('drops a correction from the queue once it is decided', async () => {
    const correctionId = await propose(10, { quantity: 100 })
    await decide(correctionId, { decision: 'rejected', note: 'No source' })

    const response = await request(app).get('/api/admin/reviews').set('Cookie', cookie)
    expect(response.body.items.map((item: { kind: string }) => item.kind)).toEqual(['submission'])
  })
})

describe('GET /api/admin/deployments/:id', () => {
  it('shows each correction with the value before, the proposal and the current value', async () => {
    const correctionId = await propose(10, { quantity: 100, commissioning_date: '2020', change_note: 'Fleet update' })

    const response = await request(app).get('/api/admin/deployments/10').set('Cookie', cookie)

    expect(response.body.corrections).toEqual([{
      id: correctionId,
      status: 'pending',
      submitted_at: expect.stringMatching(ISO_UTC),
      contributor_email: null,
      contributor_organisation: null,
      change_note: 'Fleet update',
      evidence_urls: [],
      changes: [
        { field: 'quantity', before: 96, proposed: 100, current: 96 },
        { field: 'commissioning_date', before: '2021-01-01', proposed: '2020', current: '2021-01-01' },
      ],
    }])
  })

  it('shows the current value when the record has changed since the correction was submitted', async () => {
    await propose(10, { quantity: 100 })
    await request(app)
      .patch('/api/admin/deployments/10')
      .set('Cookie', cookie)
      .set('X-Requested-With', 'fetch')
      .send({ quantity: 110 })

    const response = await request(app).get('/api/admin/deployments/10').set('Cookie', cookie)
    expect(response.body.corrections[0].changes).toEqual([{ field: 'quantity', before: 96, proposed: 100, current: 110 }])
  })
})

describe('POST /api/admin/corrections/:id/reviews', () => {
  it('applies an approved correction, keeps the record verified and attributes the change to its contributor', async () => {
    const correctionId = await propose(10, {
      quantity: 100,
      evidence_urls: ['https://example.com/fleet-2026'],
      contributor_email: 'analyst@example.com',
      change_note: 'Fleet update',
    })

    const response = await decide(correctionId, { decision: 'approved' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ id: expect.any(Number), correction_status: 'approved', verification_status: 'verified' })
    expect(await deployment10()).toEqual({ quantity: 100, verification_status: 'verified' })
    expect(await query('SELECT url FROM evidence WHERE deployment_id = 10 ORDER BY id')).toEqual([
      { url: 'https://example.com/evidence/10' },
      { url: 'https://example.com/fleet-2026' },
    ])

    const record = (await request(app).get('/api/admin/deployments/10').set('Cookie', cookie)).body
    expect(record.revisions).toEqual([expect.objectContaining({
      action: 'update',
      previous_values: { quantity: 96, evidence_urls: ['https://example.com/evidence/10'] },
      change_note: 'Fleet update',
      contributor_email: 'analyst@example.com',
      administrator: null,
    })])
    expect(record.reviews).toEqual([expect.objectContaining({ decision: 'approved', correction_id: correctionId })])
    expect(record.corrections[0].status).toBe('approved')

    // Public views show the approved values straight away
    const site = await request(app).get('/api/sites/1')
    expect(site.body.deployments.find((item: { id: number }) => item.id === 10).quantity).toBe(100)
  })

  it('applies the proposal over the record as it is now', async () => {
    const correctionId = await propose(10, { quantity: 100 })
    await request(app)
      .patch('/api/admin/deployments/10')
      .set('Cookie', cookie)
      .set('X-Requested-With', 'fetch')
      .send({ quantity: 110 })

    await decide(correctionId, { decision: 'approved' })

    expect((await deployment10())?.quantity).toBe(100)
    const [latest] = await query<{ previous_values: Record<string, unknown> }>(
      'SELECT previous_values FROM revision WHERE deployment_id = 10 ORDER BY id DESC LIMIT 1',
    )
    expect(latest?.previous_values).toEqual({ quantity: 110 })
  })

  it.each([
    ['rejected', 'Source does not mention Roy Hill'],
    ['needs_changes', 'Please add a source'],
  ])('leaves the record untouched when the correction is %s', async (decision, note) => {
    const correctionId = await propose(10, { quantity: 100, evidence_urls: ['https://example.com/fleet-2026'] })

    const response = await decide(correctionId, { decision, note })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ correction_status: decision, verification_status: 'verified' })
    expect(await deployment10()).toEqual({ quantity: 96, verification_status: 'verified' })
    expect(await query('SELECT url FROM evidence WHERE deployment_id = 10')).toEqual([{ url: 'https://example.com/evidence/10' }])
    expect(await query('SELECT id FROM revision WHERE deployment_id = 10')).toEqual([])

    const record = (await request(app).get('/api/admin/deployments/10').set('Cookie', cookie)).body
    expect(record.reviews).toEqual([expect.objectContaining({ decision, note, correction_id: correctionId })])
  })

  it('requires a note unless the correction is approved', async () => {
    const correctionId = await propose(10, { quantity: 100 })

    const response = await decide(correctionId, { decision: 'rejected' })

    expect(response.status).toBe(400)
    expect(response.body.fields).toEqual({ note: 'is required when rejecting or requesting changes' })
  })

  it('decides a correction only once, even when two decisions arrive together', async () => {
    const correctionId = await propose(10, { quantity: 100 })

    const responses = await Promise.all([
      decide(correctionId, { decision: 'approved' }),
      decide(correctionId, { decision: 'rejected', note: 'Duplicate' }),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
    const refused = responses.find((response) => response.status === 409)
    expect(refused?.body).toEqual({ error: 'only pending corrections can be decided', correction_status: expect.stringMatching(/^(approved|rejected)$/) })
    expect(await query('SELECT id FROM verification_review WHERE correction_id = $1', [correctionId])).toHaveLength(1)
  })

  it('returns 404 for an unknown or malformed correction id', async () => {
    for (const id of ['999', 'abc']) {
      const response = await decide(id, { decision: 'approved' })
      expect(response.status, id).toBe(404)
      expect(response.body, id).toEqual({ error: 'correction not found' })
    }
  })

  it('requires a signed-in administrator and the X-Requested-With header', async () => {
    const correctionId = await propose(10, { quantity: 100 })

    const anonymous = await request(app).post(`/api/admin/corrections/${correctionId}/reviews`).set('X-Requested-With', 'fetch').send({ decision: 'approved' })
    const forged = await request(app).post(`/api/admin/corrections/${correctionId}/reviews`).set('Cookie', cookie).send({ decision: 'approved' })

    expect([anonymous.status, forged.status]).toEqual([401, 403])
    expect(await deployment10()).toEqual({ quantity: 96, verification_status: 'verified' })
  })
})

describe('the deployment_correction table', () => {
  it('keeps a proposal as submitted and lets its status move only once', async () => {
    const correctionId = await propose(10, { quantity: 100 })

    await expect(query("UPDATE deployment_correction SET proposed_values = '{\"quantity\": 1}' WHERE id = $1", [correctionId]))
      .rejects.toThrow('deployment_correction only allows its status to change')
    await query("UPDATE deployment_correction SET status = 'rejected' WHERE id = $1", [correctionId])
    await expect(query("UPDATE deployment_correction SET status = 'approved' WHERE id = $1", [correctionId]))
      .rejects.toThrow(`deployment_correction ${correctionId} has already been decided`)
    await expect(query('DELETE FROM deployment_correction')).rejects.toThrow('deployment_correction is append-only; DELETE is forbidden')
  })

  it('refuses a review that links a correction to a different deployment', async () => {
    const correctionId = await propose(10, { quantity: 100 })
    const [admin] = await query<{ id: number }>('SELECT id::int AS id FROM admin_user LIMIT 1')

    await expect(query(
      "INSERT INTO verification_review (deployment_id, admin_user_id, decision, correction_id) VALUES (11, $1, 'approved', $2)",
      [admin?.id, correctionId],
    )).rejects.toMatchObject({ code: '23503', constraint: 'verification_review_correction_same_deployment_fkey' })
  })
})
