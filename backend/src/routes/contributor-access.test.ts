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

/** A public submission; returns its id and private key. */
async function submit(overrides: Record<string, unknown> = {}): Promise<{ id: number; key: string }> {
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
    commissioning_date: '2022-07-01',
    evidence_urls: ['https://example.com/jimblebar'],
    contributor_email: 'field@example.com',
    disclosure_accepted: true,
    ...overrides,
  })
  expect(response.status).toBe(201)
  return { id: response.body.id as number, key: response.body.key as string }
}

const decide = (id: number, decision: string, note?: string) =>
  request(app).post(`/api/admin/deployments/${id}/reviews`).set('Cookie', cookie).set('X-Requested-With', 'fetch').send({ decision, note })

const status = (items: unknown) => request(app).post('/api/contributions/status').send({ items })
const read = (id: number, key?: string) => {
  const call = request(app).get(`/api/contributions/${id}`)
  return key === undefined ? call : call.set('X-Contribution-Key', key)
}
const update = (id: number, key: string, body: Record<string, unknown>) =>
  request(app).patch(`/api/contributions/${id}`).set('X-Contribution-Key', key).send({ disclosure_accepted: true, ...body })

const queueIds = async () =>
  ((await request(app).get('/api/admin/reviews').set('Cookie', cookie)).body.items as { id: number }[]).map((item) => item.id)

const OTHER_KEY = 'A'.repeat(43)

describe('POST /api/contributions/status', () => {
  it('returns each matching submission with its latest decision and the note for the contributor', async () => {
    const waiting = await submit()
    const pending = await submit({ site_name: 'Yandi' })
    expect((await decide(waiting.id, 'needs_changes', 'Add the operator announcement')).status).toBe(201)

    const response = await status([waiting, pending])
    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([
      expect.objectContaining({
        id: waiting.id,
        verification_status: 'changes_requested',
        site_name: 'Jimblebar',
        machine_manufacturer: 'Komatsu',
        machine_model: '930E',
        machine_type: 'haul_truck',
        quantity: 15,
        submitted_at: expect.any(String),
        decision: { decision: 'needs_changes', note: 'Add the operator announcement', decided_at: expect.any(String) },
      }),
      expect.objectContaining({ id: pending.id, verification_status: 'pending_review', site_name: 'Yandi', decision: null }),
    ])
    // Neither the key nor its hash is ever returned
    expect(JSON.stringify(response.body)).not.toContain(waiting.key)
    expect(response.body.items[0]).not.toHaveProperty('key_hash')
  })

  it('leaves out a wrong key, another submission\'s key and a record that never had one', async () => {
    const mine = await submit()
    const theirs = await submit({ site_name: 'Yandi' })

    const response = await status([
      { id: mine.id, key: OTHER_KEY },
      { id: mine.id, key: theirs.key },
      // Seeded record 12 was loaded without a key
      { id: 12, key: mine.key },
      { id: 999_999, key: mine.key },
    ])
    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([])
  })

  it('does not count a decision on a proposed correction as the contributor\'s own', async () => {
    const mine = await submit()
    expect((await decide(mine.id, 'approved')).status).toBe(201)
    const proposed = await request(app).patch(`/api/deployments/${mine.id}`).send({ quantity: 16, disclosure_accepted: true })
    expect(proposed.status).toBe(202)
    const correctionReview = await request(app)
      .post(`/api/admin/corrections/${proposed.body.correction_id as number}/reviews`)
      .set('Cookie', cookie).set('X-Requested-With', 'fetch')
      .send({ decision: 'rejected', note: 'Not supported by a source' })
    expect(correctionReview.status).toBe(201)

    const [item] = (await status([mine])).body.items
    expect(item).toEqual(expect.objectContaining({ verification_status: 'verified', decision: expect.objectContaining({ decision: 'approved' }) }))
  })

  it.each([
    ['no items', []],
    ['more than 50 items', Array.from({ length: 51 }, (_, index) => ({ id: index + 1, key: OTHER_KEY }))],
    ['a malformed key', [{ id: 1, key: 'short' }]],
    ['a malformed id', [{ id: 'abc', key: OTHER_KEY }]],
    ['not a list', { id: 1, key: OTHER_KEY }],
  ])('refuses %s with 400', async (_label, items) => {
    const response = await status(items)
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('items must hold 1 to 50 submissions, each with its id and key')
  })

  it('accepts exactly 50 items', async () => {
    const mine = await submit()
    const items = [mine, ...Array.from({ length: 49 }, (_, index) => ({ id: 100_000 + index, key: OTHER_KEY }))]
    const response = await status(items)
    expect(response.status).toBe(200)
    expect(response.body.items.map((item: { id: number }) => item.id)).toEqual([mine.id])
  })
})

describe('GET /api/contributions/:id', () => {
  it('returns the values the update form needs to the holder of the key', async () => {
    const mine = await submit({ commissioning_date: '2022' })

    const response = await read(mine.id, mine.key)
    expect(response.status).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({
      id: mine.id,
      verification_status: 'pending_review',
      quantity: 15,
      environment: 'surface',
      deployment_status: 'operational',
      automation_level: 'autonomous',
      installation_type: 'unknown',
      commissioning_date: '2022',
      evidence_urls: ['https://example.com/jimblebar'],
    }))
  })

  it.each([
    ['no key', undefined],
    ['a wrong key', OTHER_KEY],
    ['a malformed key', 'not-a-key'],
  ])('answers %s as not found', async (_label, key) => {
    const mine = await submit()
    const response = await read(mine.id, key)
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'contribution not found' })
  })
})

describe('PATCH /api/contributions/:id', () => {
  it('answers a request for changes: the record returns to the queue, attributed to its contributor', async () => {
    const mine = await submit()
    expect((await decide(mine.id, 'needs_changes', 'Add the operator announcement')).status).toBe(201)
    expect(await queueIds()).not.toContain(mine.id)

    const response = await update(mine.id, mine.key, {
      quantity: 18,
      evidence_urls: ['https://example.com/operator-announcement'],
      change_note: 'Added the announcement; three more trucks since',
    })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: mine.id, verification_status: 'pending_review' })
    expect(await queueIds()).toContain(mine.id)

    const record = await request(app).get(`/api/admin/deployments/${mine.id}`).set('Cookie', cookie)
    expect(record.body.quantity).toBe(18)
    expect(record.body.evidence.map((item: { url: string }) => item.url)).toEqual([
      'https://example.com/jimblebar',
      'https://example.com/operator-announcement',
    ])
    expect(record.body.revisions.at(-1)).toEqual(expect.objectContaining({
      action: 'update',
      previous_values: { quantity: 15, evidence_urls: ['https://example.com/jimblebar'], verification_status: 'changes_requested' },
      change_note: 'Added the announcement; three more trucks since',
      contributor_email: 'field@example.com',
      administrator: null,
    }))

    // The queue tells the administrator this answers their request
    const queue = await request(app).get('/api/admin/reviews').set('Cookie', cookie)
    expect(queue.body.items.find((item: { id: number }) => item.id === mine.id)).toEqual(expect.objectContaining({
      kind: 'correction',
      after_changes_requested: true,
      changed_fields: ['quantity', 'evidence_urls'],
    }))
  })

  it.each([
    ['pending review', null],
    ['verified', 'approved'],
    ['rejected', 'rejected'],
  ])('refuses a submission that is %s, changing nothing', async (_label, decision) => {
    const mine = await submit()
    if (decision) expect((await decide(mine.id, decision, 'Decided')).status).toBe(201)
    const before = await query('SELECT quantity, verification_status::text FROM deployment WHERE id = $1', [mine.id])

    const response = await update(mine.id, mine.key, { quantity: 18 })
    expect(response.status).toBe(409)
    expect(response.body.error).toBe('only a submission with changes requested can be updated')
    expect(await query('SELECT quantity, verification_status::text FROM deployment WHERE id = $1', [mine.id])).toEqual(before)
    expect(await query("SELECT id FROM revision WHERE deployment_id = $1 AND action = 'update'", [mine.id])).toEqual([])
  })

  it('answers a wrong key as not found and changes nothing', async () => {
    const mine = await submit()
    const theirs = await submit({ site_name: 'Yandi' })
    expect((await decide(mine.id, 'needs_changes', 'Add a source')).status).toBe(201)

    for (const key of [OTHER_KEY, theirs.key]) {
      const response = await update(mine.id, key, { quantity: 18 })
      expect(response.status).toBe(404)
      expect(response.body).toEqual({ error: 'contribution not found' })
    }
    const [row] = await query<{ quantity: number }>('SELECT quantity FROM deployment WHERE id = $1', [mine.id])
    expect(row?.quantity).toBe(15)
  })

  it('returns 400 for a change that matches the record, or a hidden website field', async () => {
    const mine = await submit()
    expect((await decide(mine.id, 'needs_changes', 'Add a source')).status).toBe(201)

    expect((await update(mine.id, mine.key, { quantity: 15 })).body).toEqual({ error: 'update does not change the submission' })
    const bot = await update(mine.id, mine.key, { quantity: 18, website: 'https://spam.example' })
    expect(bot.status).toBe(400)
    expect(bot.body).toEqual({ error: 'invalid update' })
  })

  it('supplies the coordinates of a site that has none, so the record can be approved', async () => {
    const mine = await submit({ site_name: 'Unmapped Pit', latitude: null, longitude: null })
    expect((await read(mine.id, mine.key)).body).toEqual(expect.objectContaining({ latitude: null, longitude: null }))
    expect((await decide(mine.id, 'approved')).body.error).toBe('site coordinates are required before the record can be verified')
    expect((await decide(mine.id, 'needs_changes', 'Please add the site location')).status).toBe(201)

    const response = await update(mine.id, mine.key, { latitude: -23.1, longitude: 119.2 })
    expect(response.status).toBe(200)
    expect((await read(mine.id, mine.key)).body).toEqual(expect.objectContaining({ latitude: -23.1, longitude: 119.2 }))
    const [revision] = await query<{ previous_values: unknown }>("SELECT previous_values FROM revision WHERE deployment_id = $1 AND action = 'update'", [mine.id])
    expect(revision?.previous_values).toEqual({ latitude: null, longitude: null, verification_status: 'changes_requested' })

    expect((await decide(mine.id, 'approved')).status).toBe(201)
  })

  it('refuses to move a site that already has coordinates, which other records share', async () => {
    const mine = await submit()
    expect((await decide(mine.id, 'needs_changes', 'Add a source')).status).toBe(201)

    const response = await update(mine.id, mine.key, { latitude: 10, longitude: 10, quantity: 18 })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid update', fields: { latitude: 'the site already has coordinates', longitude: 'the site already has coordinates' } })
    const [row] = await query<{ quantity: number }>('SELECT quantity FROM deployment WHERE id = $1', [mine.id])
    expect(row?.quantity).toBe(15)
  })

  it('needs both coordinates together', async () => {
    const mine = await submit({ site_name: 'Unmapped Pit', latitude: null, longitude: null })
    expect((await decide(mine.id, 'needs_changes', 'Please add the site location')).status).toBe(201)

    const response = await update(mine.id, mine.key, { latitude: -23.1 })
    expect(response.status).toBe(400)
    expect(response.body.fields).toEqual({ longitude: 'must be given with latitude' })
  })

  it('closes the validity window when the update decommissions the record (#156)', async () => {
    const mine = await submit()
    expect((await decide(mine.id, 'needs_changes', 'Is it still running?')).status).toBe(201)

    expect((await update(mine.id, mine.key, { deployment_status: 'decommissioned' })).status).toBe(200)
    const [row] = await query<{ valid_to: string; today: string }>('SELECT valid_to::text, CURRENT_DATE::text AS today FROM deployment WHERE id = $1', [mine.id])
    expect(row?.valid_to).toBe(row?.today)
  })

  it('refuses a commissioning date after the end of the window, storing nothing', async () => {
    const mine = await submit({ deployment_status: 'decommissioned' })
    expect((await decide(mine.id, 'needs_changes', 'Check the dates')).status).toBe(201)
    const [window] = await query<{ valid_to: string }>('SELECT valid_to::text FROM deployment WHERE id = $1', [mine.id])
    const later = `${Number(window?.valid_to.slice(0, 4)) + 1}-03-01`

    const response = await update(mine.id, mine.key, { commissioning_date: later })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid update', fields: { commissioning_date: 'must not be after valid_to' } })
    expect(await query("SELECT id FROM revision WHERE deployment_id = $1 AND action = 'update'", [mine.id])).toEqual([])
  })
})

describe('resubmitting a rejected submission (FR-60)', () => {
  it('links the new record to the rejected one, both ways, with the reason it was rejected', async () => {
    const rejected = await submit()
    expect((await decide(rejected.id, 'rejected', 'The site is the processing plant, not the mine')).status).toBe(201)

    const response = await request(app).post('/api/contributions').send({
      site_name: 'Jimblebar', country_code: 'AU', machine_type: 'haul_truck', machine_manufacturer: 'Komatsu', machine_model: '930E',
      quantity: 15, automation_level: 'autonomous', technology_supplier: 'Komatsu', disclosure_accepted: true,
      evidence_urls: ['https://example.com/jimblebar-mine'],
      resubmission_of: { id: rejected.id, key: rejected.key },
    })
    expect(response.status).toBe(201)
    const resubmitted = response.body.id as number

    const record = await request(app).get(`/api/admin/deployments/${resubmitted}`).set('Cookie', cookie)
    expect(record.body.resubmission_of).toEqual({
      id: rejected.id,
      verification_status: 'rejected',
      decision: 'rejected',
      note: 'The site is the processing plant, not the mine',
      administrator: expect.any(String),
      reviewed_at: expect.any(String),
    })
    // The earlier attempt also shows among the possible duplicates, labelled rejected
    expect(record.body.possible_duplicates).toEqual(expect.arrayContaining([expect.objectContaining({ id: rejected.id, verification_status: 'rejected' })]))

    const earlier = await request(app).get(`/api/admin/deployments/${rejected.id}`).set('Cookie', cookie)
    expect(earlier.body.resubmitted_as).toEqual([{ id: resubmitted, verification_status: 'pending_review' }])

    const queue = await request(app).get('/api/admin/reviews').set('Cookie', cookie)
    expect(queue.body.items.find((item: { id: number }) => item.id === resubmitted)).toEqual(expect.objectContaining({ resubmission_of: rejected.id }))

    const statuses = await status([rejected, { id: resubmitted, key: response.body.key as string }])
    expect(statuses.body.items).toEqual([
      expect.objectContaining({ id: rejected.id, resubmitted_as: resubmitted, resubmission_of: null }),
      expect.objectContaining({ id: resubmitted, resubmission_of: rejected.id, resubmitted_as: null }),
    ])
  })

  it.each([
    ['a wrong key', 'rejected', true],
    ['a record that is not rejected', null, false],
  ])('refuses %s and stores nothing', async (_label, decision, wrongKey) => {
    const earlier = await submit()
    if (decision) expect((await decide(earlier.id, decision, 'Closed')).status).toBe(201)
    const [before] = await query<{ count: number }>('SELECT COUNT(*)::int AS count FROM deployment')

    const response = await request(app).post('/api/contributions').send({
      site_name: 'Jimblebar', country_code: 'AU', machine_type: 'haul_truck', machine_manufacturer: 'Komatsu', machine_model: '930E',
      quantity: 15, automation_level: 'autonomous', technology_supplier: 'Komatsu', disclosure_accepted: true,
      resubmission_of: { id: earlier.id, key: wrongKey ? OTHER_KEY : earlier.key },
    })
    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid contribution', fields: { resubmission_of: 'is not a rejected submission of yours' } })
    const [after] = await query<{ count: number }>('SELECT COUNT(*)::int AS count FROM deployment')
    expect(after?.count).toBe(before?.count)
  })

  it('rejects a malformed link before anything else', async () => {
    const response = await request(app).post('/api/contributions').send({ resubmission_of: { id: 'abc', key: 'short' } })
    expect(response.status).toBe(400)
    expect(response.body.fields.resubmission_of).toBe('must hold the id and key of the rejected submission')
  })

  it('returns every field the form is prefilled with', async () => {
    const mine = await submit({ region: 'Pilbara', commodity: 'iron_ore', machine_model_variant: 'AC', technology_product: 'FrontRunner' })
    const response = await read(mine.id, mine.key)
    expect(response.body).toEqual(expect.objectContaining({
      site_name: 'Jimblebar', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore', latitude: -22.3, longitude: 118.7,
      machine_type: 'haul_truck', machine_manufacturer: 'Komatsu', machine_model: '930E', machine_model_variant: 'AC',
      technology_supplier: 'Komatsu', technology_product: 'FrontRunner',
    }))
  })
})
