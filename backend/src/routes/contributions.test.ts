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

/** The request body sent by the contribution form in PR #74. */
const formBody = {
  site_name: 'Jimblebar',
  country_code: 'au',
  region: 'Pilbara',
  commodity: 'iron_ore',
  machine_type: 'haul_truck',
  machine_manufacturer: 'Komatsu',
  machine_model: '930E',
  machine_model_variant: null,
  quantity: 15,
  environment: 'surface',
  deployment_status: 'operational',
  automation_level: 'autonomous',
  installation_type: 'factory_installed',
  technology_supplier: 'Komatsu',
  technology_product: 'FrontRunner',
  commissioning_date: '2022-07-01',
  evidence_urls: ['https://example.com/jimblebar'],
  contributor_email: null,
  organisation: null,
  disclosure_accepted: true,
}

describe('POST /api/contributions', () => {
  it('stores a valid submission and returns 201 with its id and status', async () => {
    const response = await request(app).post('/api/contributions').send(formBody)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ id: expect.any(Number), verification_status: 'pending_review' })

    expect(await query(
      `SELECT m.model_variant FROM deployment d
       JOIN machine_model m ON m.id = d.machine_model_id WHERE d.id = $1`,
      [response.body.id],
    )).toEqual([{ model_variant: null }])

    const evidence = await query<{ url: string }>('SELECT url FROM evidence WHERE deployment_id = $1', [response.body.id])
    expect(evidence).toEqual([{ url: 'https://example.com/jimblebar' }])
  })

  it('keeps the new record out of public views until it is verified', async () => {
    await request(app).post('/api/contributions').send(formBody)

    const map = await request(app).get('/api/map')
    expect(map.body.features.map((feature: { properties: { name: string } }) => feature.properties.name)).not.toContain('Jimblebar')
  })

  it('returns 400 with every invalid field', async () => {
    const response = await request(app)
      .post('/api/contributions')
      .send({ ...formBody, site_name: '', quantity: -1, evidence_urls: ['not a url'], disclosure_accepted: false })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'invalid contribution',
      fields: {
        site_name: 'is required',
        quantity: 'must be a whole number between 1 and 100000',
        evidence_urls: 'must contain only http or https URLs',
        disclosure_accepted: 'must be true',
      },
    })
    expect(await query('SELECT id FROM deployment WHERE verification_status = $1', ['pending_review'])).toHaveLength(1)
  })

  it('rejects a body that is not a JSON object', async () => {
    const response = await request(app).post('/api/contributions').send([formBody])

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid contribution', fields: { body: 'must be a JSON object' } })
  })
})
