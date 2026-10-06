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

async function today(): Promise<{ date: string; year: number }> {
  const [row] = await query<{ date: string; year: number }>(
    'SELECT CURRENT_DATE::text AS date, EXTRACT(YEAR FROM CURRENT_DATE)::int AS year',
  )
  if (!row) throw new Error('no date')
  return row
}

async function validity(id: number) {
  const [row] = await query<{ status: string; valid_from: string | null; valid_to: string | null }>(
    'SELECT status::text, valid_from::text, valid_to::text FROM deployment WHERE id = $1',
    [id],
  )
  return row
}

const adminCorrect = (id: number, body: Record<string, unknown>) =>
  request(app).patch(`/api/admin/deployments/${id}`).set('Cookie', cookie).set('X-Requested-With', 'fetch').send(body)

async function mapSiteIds(year: number, includeDecommissioned = false): Promise<number[]> {
  const response = await request(app).get(`/api/map?year=${year}${includeDecommissioned ? '&include_decommissioned=true' : ''}`)
  return response.body.features.map((feature: { properties: { id: number } }) => feature.properties.id).sort()
}

describe('decommissioning closes the validity window (#156)', () => {
  it('ends the window today when an administrator decommissions a record, taking it off the default map', async () => {
    const { date, year } = await today()
    // Site 2's deployment has no commissioning year, so the year view leaves it out
    expect(await mapSiteIds(year)).toEqual([1])

    const response = await adminCorrect(10, { deployment_status: 'decommissioned' })
    expect(response.status).toBe(200)
    expect(await validity(10)).toEqual({ status: 'decommissioned', valid_from: '2021-01-01', valid_to: date })

    const [revision] = await query<{ previous_values: Record<string, unknown> }>(
      'SELECT previous_values FROM revision WHERE deployment_id = 10',
    )
    expect(revision?.previous_values).toMatchObject({ deployment_status: 'operational', valid_to: null })

    // Site 1 had only deployment 10 in service; it returns with the decommissioned option
    expect(await mapSiteIds(year)).toEqual([])
    expect(await mapSiteIds(year, true)).toEqual([1])
  })

  it('ends the window when a public correction decommissions a record that is not verified', async () => {
    const { date } = await today()
    const response = await request(app).patch('/api/deployments/12').send({ deployment_status: 'decommissioned', disclosure_accepted: true })

    expect(response.status).toBe(200)
    expect((await validity(12))?.valid_to).toBe(date)
  })

  it('ends the window only when a proposal to decommission a verified record is approved', async () => {
    const { date } = await today()
    const proposed = await request(app).patch('/api/deployments/10').send({ deployment_status: 'decommissioned', disclosure_accepted: true })
    expect(proposed.status).toBe(202)
    expect(await validity(10)).toEqual({ status: 'operational', valid_from: '2021-01-01', valid_to: null })

    const decided = await request(app)
      .post(`/api/admin/corrections/${proposed.body.correction_id}/reviews`)
      .set('Cookie', cookie)
      .set('X-Requested-With', 'fetch')
      .send({ decision: 'approved' })
    expect(decided.status).toBe(201)
    expect((await validity(10))?.valid_to).toBe(date)
  })

  it('keeps an end date that is already recorded', async () => {
    await adminCorrect(14, { deployment_status: 'operational' })
    await adminCorrect(14, { deployment_status: 'decommissioned' })

    expect((await validity(14))?.valid_to).toBe('2020-12-31')
  })

  it('ends the window of a new submission that is already decommissioned', async () => {
    const { date } = await today()
    const response = await request(app).post('/api/contributions').send({
      site_name: 'Closed Pit',
      country_code: 'AU',
      machine_type: 'drill',
      machine_manufacturer: 'Epiroc',
      quantity: 2,
      deployment_status: 'decommissioned',
      commissioning_date: '2016-04-01',
      disclosure_accepted: true,
    })

    expect(response.status).toBe(201)
    expect(await validity(response.body.id)).toEqual({ status: 'decommissioned', valid_from: '2016-04-01', valid_to: date })
  })
})

describe('the validity window follows the commissioning date (#156)', () => {
  it('moves a window that opened on the commissioning date', async () => {
    const response = await adminCorrect(10, { commissioning_date: '2020-06-01' })

    expect(response.status).toBe(200)
    expect((await validity(10))?.valid_from).toBe('2020-06-01')
  })

  it('leaves a window that was set separately', async () => {
    // Deployment 11 has no commissioning date but is valid from 2023-06-01
    await adminCorrect(11, { commissioning_date: '2019-03-01' })

    expect((await validity(11))?.valid_from).toBe('2023-06-01')
  })

  it('does not invent a start date for a year-only commissioning', async () => {
    await adminCorrect(10, { commissioning_date: '2019' })

    expect((await validity(10))?.valid_from).toBeNull()
  })
})

describe('administrators can correct the validity window (FR-11)', () => {
  it('sets an end date, which takes the record off the map from that year', async () => {
    const { year } = await today()
    const response = await adminCorrect(10, { valid_to: `${year - 1}-12-31` })

    expect(response.status).toBe(200)
    expect((await validity(10))?.valid_to).toBe(`${year - 1}-12-31`)
    expect(await mapSiteIds(year)).toEqual([])
    expect(await mapSiteIds(year - 1)).toEqual([1])
  })

  it('keeps an explicit end date when decommissioning in the same correction', async () => {
    await adminCorrect(10, { deployment_status: 'decommissioned', valid_to: '2024-05-01' })

    expect((await validity(10))?.valid_to).toBe('2024-05-01')
  })

  it('rejects an end before the start, given together or against the record', async () => {
    const together = await adminCorrect(10, { valid_from: '2024-01-01', valid_to: '2023-01-01' })
    expect(together.status).toBe(400)
    expect(together.body.fields).toEqual({ valid_to: 'must not be before valid_from' })

    const againstRecord = await adminCorrect(10, { valid_to: '2020-01-01' })
    expect(againstRecord.status).toBe(400)
    expect(againstRecord.body).toEqual({ error: 'invalid correction', fields: { valid_to: 'must not be before valid_from' } })
    expect((await validity(10))?.valid_to).toBeNull()
  })

  it('rejects a date that is not a real calendar date', async () => {
    const response = await adminCorrect(10, { valid_from: '2021-02-30' })

    expect(response.status).toBe(400)
    expect(response.body.fields).toEqual({ valid_from: 'must be a date (YYYY-MM-DD)' })
  })

  it('does not let a public correction change the window', async () => {
    const response = await request(app).patch('/api/deployments/12').send({ valid_to: '2020-01-01', disclosure_accepted: true })

    expect(response.status).toBe(400)
    expect((await validity(12))?.valid_to).toBeNull()
  })
})
