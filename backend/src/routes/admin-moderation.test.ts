import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')
const { signedInAdmin } = await import('../test/admin.js')
const { createAdmin } = await import('../services/admin-auth.js')

let cookie: string
let adminId: number

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
  ;({ cookie, id: adminId } = await signedInAdmin(app))
})

afterAll(async () => {
  await closeDatabase()
})

/** A public contribution; returns the new deployment id. */
async function contribute(overrides: Record<string, unknown> = {}): Promise<number> {
  const response = await request(app).post('/api/contributions').send({
    site_name: 'Jimblebar',
    country_code: 'au',
    region: 'Pilbara',
    commodity: 'iron_ore',
    latitude: -22.3,
    longitude: 118.7,
    machine_type: 'haul_truck',
    machine_manufacturer: 'Komatsu',
    machine_model: '930E',
    quantity: 15,
    environment: 'surface',
    deployment_status: 'operational',
    automation_level: 'autonomous',
    technology_supplier: 'Komatsu',
    technology_product: 'FrontRunner',
    commissioning_date: '2022-07-01',
    evidence_urls: ['https://example.com/jimblebar'],
    disclosure_accepted: true,
    ...overrides,
  })
  expect(response.status).toBe(201)
  return response.body.id as number
}

const review = (id: number, body: Record<string, unknown>) =>
  request(app).post(`/api/admin/deployments/${id}/reviews`).set('Cookie', cookie).set('X-Requested-With', 'fetch').send(body)

const correct = (id: number, body: Record<string, unknown>) =>
  request(app).patch(`/api/admin/deployments/${id}`).set('Cookie', cookie).set('X-Requested-With', 'fetch').send(body)

const queueIds = async () =>
  ((await request(app).get('/api/admin/reviews').set('Cookie', cookie)).body.items as { id: number }[]).map((item) => item.id)

describe('access control', () => {
  it('returns 401 from every moderation route without a session', async () => {
    const responses = await Promise.all([
      request(app).get('/api/admin/reviews'),
      request(app).get('/api/admin/deployments/12'),
      request(app).post('/api/admin/deployments/12/reviews').set('X-Requested-With', 'fetch').send({ decision: 'approved' }),
      request(app).patch('/api/admin/deployments/12').set('X-Requested-With', 'fetch').send({ quantity: 9 }),
    ])
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401])
  })

  it('returns 403 until a temporary password is changed', async () => {
    const created = await createAdmin('new@example.com', 'admin')
    if (created.kind !== 'created') throw new Error('admin was not created')
    const signIn = await request(app).post('/api/admin/session').set('X-Requested-With', 'fetch')
      .send({ email: 'new@example.com', password: created.temporaryPassword })
    const pending = [signIn.headers['set-cookie']].flat().find((value) => value?.startsWith('admin_session='))?.split(';')[0] ?? ''

    const response = await request(app).get('/api/admin/reviews').set('Cookie', pending)
    expect(response.status).toBe(403)
  })

  it('refuses a decision without the X-Requested-With header', async () => {
    const response = await request(app).post('/api/admin/deployments/12/reviews').set('Cookie', cookie).send({ decision: 'rejected', note: 'x' })
    expect(response.status).toBe(403)
  })
})

describe('GET /api/admin/submissions', () => {
  it('requires an administrator session', async () => {
    const response = await request(app).get('/api/admin/submissions')
    expect(response.status).toBe(401)
  })

  it('returns submission history with the default pagination', async () => {
    const response = await request(app)
      .get('/api/admin/submissions')
      .set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          site_name: expect.any(String),
          country_code: expect.any(String),
          verification_status: expect.any(String),
          updated_at: expect.any(String),
        }),
      ]),
    )
  })

  it('uses the latest correction review as the submission history decision', async () => {
    const id = await contribute()

    const initialReview = await review(id, { decision: 'approved' })
    expect(initialReview.status).toBe(201)

    const proposal = await request(app)
      .patch(`/api/deployments/${id}`)
      .send({
        quantity: 20,
        disclosure_accepted: true,
      })
    expect(proposal.status).toBe(202)

    const correctionId = proposal.body.correction_id as number

    const correctionReview = await request(app)
      .post(`/api/admin/corrections/${correctionId}/reviews`)
      .set('Cookie', cookie)
      .set('X-Requested-With', 'fetch')
      .send({ decision: 'rejected', note: 'Insufficient supporting evidence' })
    expect(correctionReview.status).toBe(201)

    const response = await request(app)
      .get(`/api/admin/submissions?id=${id}`)
      .set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([
      expect.objectContaining({
        id,
        latest_decision: 'rejected',
        latest_decision_is_correction: true,
      }),
    ])
  })
  it('filters history by deployment ID', async () => {
    const response = await request(app)
      .get('/api/admin/submissions?id=12')
      .set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body.items.map((item: { id: number }) => item.id)).toEqual([12])
  })

  it.each([
    'limit=0',
    'limit=101',
    'limit=abc',
    'offset=-1',
    'offset=abc',
    'id=0',
    'id=abc',
  ])('rejects invalid query parameters: %s', async (query) => {
    const response = await request(app)
      .get(`/api/admin/submissions?${query}`)
      .set('Cookie', cookie)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid pagination or submission ID')
  })
})
describe('GET /api/admin/reviews', () => {
  it('lists records pending review, least recently changed first', async () => {
    const contributed = await contribute()

    const response = await request(app).get('/api/admin/reviews').set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body.items.map((item: { id: number }) => item.id)).toEqual([12, contributed])
    expect(response.body.items[0]).toMatchObject({
      id: 12,
      site_name: 'Kalgoorlie Super Pit',
      machine_manufacturer: 'Sandvik',
      machine_type: 'lhd',
      quantity: 8,
      technology_supplier: 'Sandvik',
      technology_product: 'Sandvik AutoMine',
      evidence_count: 0,
      kind: 'submission',
      changed_fields: [],
      contributor_email: null,
      contributor_organisation: null,
    })
  })

  it('identifies a contributor correction and exposes its changed fields', async () => {
    await request(app).patch('/api/deployments/12').send({
      quantity: 9,
      evidence_urls: ['https://example.com/correction/12'],
      contributor_email: 'field@example.com',
      organisation: 'Example Mining',
      disclosure_accepted: true,
    }).expect(200)

    const response = await request(app).get('/api/admin/reviews').set('Cookie', cookie)
    expect(response.status).toBe(200)
    expect(response.body.items.find((item: { id: number }) => item.id === 12)).toMatchObject({
      kind: 'correction',
      changed_fields: ['quantity', 'evidence_urls'],
      contributor_email: 'field@example.com',
      contributor_organisation: 'Example Mining',
    })
  })
})

describe('GET /api/admin/deployments/:id', () => {
  it('shows the supplier of a submission that names no product, in the queue and on the record', async () => {
    const id = await contribute({ technology_product: null })

    const queue = await request(app).get('/api/admin/reviews').set('Cookie', cookie)
    expect(queue.body.items).toContainEqual(expect.objectContaining({ id, technology_supplier: 'Komatsu' }))

    const record = await request(app).get(`/api/admin/deployments/${id}`).set('Cookie', cookie)
    expect(record.body).toMatchObject({ technology_supplier: 'Komatsu', technology_product: null })
  })

  it('returns a record in any status with its evidence and history', async () => {
    const response = await request(app).get('/api/admin/deployments/10').set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      id: 10,
      verification_status: 'verified',
      site_name: 'Roy Hill',
      machine_model: 'Caterpillar 793F',
      technology_product: 'Cat MineStar Command for hauling',
      evidence: [{ url: 'https://example.com/evidence/10', source_type: 'company_release' }],
      reviews: [],
      revisions: [],
    })
  })

  it('shows the contributor of a submission in its revision history', async () => {
    const id = await contribute({ contributor_email: 'Field@Example.com', organisation: 'Example Mining' })
    const response = await request(app).get(`/api/admin/deployments/${id}`).set('Cookie', cookie)
    expect(response.body.revisions).toEqual([
      expect.objectContaining({ action: 'create', contributor_email: 'Field@Example.com', contributor_organisation: 'Example Mining', administrator: null }),
    ])
  })

  it.each(['999', 'abc'])('returns 404 for %s', async (id) => {
    const response = await request(app).get(`/api/admin/deployments/${id}`).set('Cookie', cookie)
    expect(response.status).toBe(404)
  })
})

describe('POST /api/admin/deployments/:id/reviews', () => {
  it('requires coordinates before a contribution can be approved', async () => {
    const id = await contribute({ latitude: undefined, longitude: undefined })

    const refused = await review(id, { decision: 'approved' })
    expect(refused.status).toBe(409)
    expect(refused.body.error).toBe('site coordinates are required before the record can be verified')

    expect((await correct(id, { latitude: -22.3, longitude: 118.7 })).status).toBe(200)
    expect((await review(id, { decision: 'approved' })).status).toBe(201)
  })

  it('approves a record: review, status and revision change together, and it becomes public', async () => {
    const id = await contribute()

    const response = await review(id, { decision: 'approved' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ id: expect.any(Number), verification_status: 'verified' })
    expect(await query('SELECT admin_user_id::int AS admin, decision::text AS decision, review_note FROM verification_review')).toEqual([
      { admin: adminId, decision: 'approved', review_note: null },
    ])
    expect(await query(`SELECT admin_user_id::int AS admin, previous_values FROM revision WHERE action = 'verification_change'`)).toEqual([
      { admin: adminId, previous_values: { verification_status: 'pending_review' } },
    ])
    expect(await queueIds()).toEqual([12])

    const register = await request(app).get('/api/register?q=Jimblebar')
    expect(register.body.total).toBe(1)
  })

  it('refuses to approve a record without evidence until an administrator adds some', async () => {
    const refused = await review(12, { decision: 'approved' })
    expect(refused.status).toBe(409)
    expect(refused.body.error).toBe('at least one evidence URL is required before the record can be verified')

    const added = await correct(12, { evidence_urls: ['https://example.com/evidence/12'] })
    expect(added.status).toBe(200)
    expect(added.body.verification_status).toBe('pending_review')

    expect((await review(12, { decision: 'approved' })).status).toBe(201)
  })

  it('approves a record that names a supplier but no technology product (FR-08)', async () => {
    const id = await contribute({ technology_product: null })

    const approved = await review(id, { decision: 'approved' })
    expect(approved.status).toBe(201)
    expect(approved.body.verification_status).toBe('verified')
  })

  it('still refuses to approve a record without evidence', async () => {
    const id = await contribute({ technology_product: null, evidence_urls: [] })

    const refused = await review(id, { decision: 'approved' })
    expect(refused.status).toBe(409)
    expect(refused.body.error).toBe('at least one evidence URL is required before the record can be verified')
  })

  it('rejects with a note and takes the record out of the queue for good', async () => {
    const rejected = await review(12, { decision: 'rejected', note: 'Duplicate of an existing record' })
    expect(rejected.status).toBe(201)
    expect(rejected.body.verification_status).toBe('rejected')
    expect(await queueIds()).toEqual([])

    const again = await review(12, { decision: 'approved' })
    expect(again.status).toBe(409)
    expect(again.body).toEqual({ error: 'only records pending review can be decided', verification_status: 'rejected' })
  })

  it('asks for changes, and a contributor correction returns the record to the queue', async () => {
    const asked = await review(12, { decision: 'needs_changes', note: 'Please add a source' })
    expect(asked.body.verification_status).toBe('unverified')
    expect(await queueIds()).toEqual([])

    const corrected = await request(app).patch('/api/deployments/12').send({
      evidence_urls: ['https://example.com/evidence/12'],
      disclosure_accepted: true,
    })
    expect(corrected.status).toBe(200)
    expect(await queueIds()).toEqual([12])
  })

  it.each([
    [{ decision: 'rejected' }, { note: 'is required when rejecting or requesting changes' }],
    [{ decision: 'needs_changes', note: '   ' }, { note: 'is required when rejecting or requesting changes' }],
    [{ decision: 'maybe' }, { decision: 'must be one of: approved, rejected, needs_changes' }],
    [{}, { decision: 'is required' }],
  ])('returns 400 for %j', async (body, fields) => {
    const response = await review(12, body)
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid review', fields })
  })

  it('refuses a decision on a verified record', async () => {
    const response = await review(10, { decision: 'rejected', note: 'x' })
    expect(response.status).toBe(409)
  })

  it('returns 404 for an unknown record', async () => {
    expect((await review(999, { decision: 'approved' })).status).toBe(404)
  })
})

describe('PATCH /api/admin/deployments/:id', () => {
  it('adds coordinates to a contributed site so it can appear on the map', async () => {
    const id = await contribute({ site_name: 'Unlocated Site', latitude: undefined, longitude: undefined })
    const response = await correct(id, { latitude: -22.3, longitude: 118.7 })

    expect(response.status).toBe(200)
    expect((await request(app).get(`/api/admin/deployments/${id}`).set('Cookie', cookie)).body).toMatchObject({
      latitude: -22.3,
      longitude: 118.7,
    })
  })

  it('refuses to clear the automation level, which every deployment must carry (FR-57)', async () => {
    const response = await correct(12, { clear_automation_level: true })

    expect(response.status).toBe(400)
    expect(response.body.fields).toEqual({ clear_automation_level: 'cannot clear a required automation level' })
    expect(await query('SELECT automation_level::text FROM deployment WHERE id = 12')).toEqual([{ automation_level: 'semi_autonomous' }])
    expect(await query('SELECT id FROM revision WHERE deployment_id = 12')).toEqual([])
  })

  it('still corrects the level, and rejects a clear flag that is not a boolean', async () => {
    const corrected = await correct(12, { automation_level: 'teleremote' })
    expect(corrected.status).toBe(200)
    expect(await query('SELECT automation_level::text FROM deployment WHERE id = 12')).toEqual([{ automation_level: 'teleremote' }])

    const notBoolean = await correct(12, { clear_automation_level: 'yes' })
    expect(notBoolean.status).toBe(400)
    expect(notBoolean.body.fields).toEqual({ clear_automation_level: 'must be true or false' })
  })

  it('corrects a verified record, keeps it verified and records the administrator', async () => {
    const response = await correct(10, { quantity: 90, change_note: 'Fleet count from the 2024 report' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: 10, verification_status: 'verified' })

    const record = (await request(app).get('/api/admin/deployments/10').set('Cookie', cookie)).body
    expect(record.quantity).toBe(90)
    expect(record.revisions).toEqual([
      expect.objectContaining({
        action: 'update',
        previous_values: { quantity: 96 },
        change_note: 'Fleet count from the 2024 report',
        administrator: 'reviewer@example.com',
        contributor_email: null,
      }),
    ])
  })

  it('records the previous technology product when it changes', async () => {
    await correct(12, { technology_supplier: 'RCT', technology_product: 'RCT ControlMaster' })
    const [revision] = await query<{ previous_values: Record<string, unknown> }>('SELECT previous_values FROM revision')
    expect(revision?.previous_values).toEqual({ technology_supplier: 'Sandvik', technology_product: 'Sandvik AutoMine' })
  })

  it('changes the supplier on its own, dropping a product that belongs to the old supplier', async () => {
    const response = await correct(12, { technology_supplier: 'RCT' })
    expect(response.status).toBe(200)

    expect(await query(
      'SELECT c.name AS supplier, d.technology_product_id FROM deployment d JOIN company c ON c.id = d.technology_supplier_id WHERE d.id = 12',
    )).toEqual([{ supplier: 'RCT', technology_product_id: null }])
    const [revision] = await query<{ previous_values: Record<string, unknown> }>('SELECT previous_values FROM revision')
    expect(revision?.previous_values).toEqual({ technology_supplier: 'Sandvik', technology_product: 'Sandvik AutoMine' })
  })

  it('keeps the product when the same supplier is given without one', async () => {
    const response = await correct(12, { technology_supplier: 'sandvik' })
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('correction does not change the record')
    expect(await query('SELECT technology_product_id::int AS id FROM deployment WHERE id = 12')).toEqual([{ id: 3 }])
  })

  it.each([
    [{ quantity: 8 }, 'correction does not change the record'],
    [{ technology_supplier: 'Sandvik', technology_product: 'Sandvik AutoMine' }, 'correction does not change the record'],
  ])('returns 400 when nothing changes: %j', async (body, error) => {
    const response = await correct(12, body)
    expect(response.status).toBe(400)
    expect(response.body.error).toBe(error)
  })

  it.each([
    [{ technology_product: 'AutoMine' }, 'technology_supplier'],
    [{ quantity: -1 }, 'quantity'],
    [{}, 'body'],
  ])('returns 400 with field errors for %j', async (body, field) => {
    const response = await correct(12, body)
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('invalid correction')
    expect(Object.keys(response.body.fields)).toContain(field)
  })
})
