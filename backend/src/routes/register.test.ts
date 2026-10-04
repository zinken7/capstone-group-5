import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase } = await import('../database.js')
const { resetDatabase, seedMapFixtures } = await import('../test/fixtures.js')

beforeEach(async () => {
  await resetDatabase()
  await seedMapFixtures()
})

afterAll(async () => {
  await closeDatabase()
})

function itemIds(body: { items: Array<{ id: number }> }): number[] {
  return body.items.map((item) => item.id)
}

describe('GET /api/register', () => {
  it('returns a page of verified deployments with the total count', async () => {
    const response = await request(app).get('/api/register')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ total: 3, limit: 50, offset: 0 })
    expect(itemIds(response.body)).toEqual([11, 10, 14])
    expect(response.body.items[1]).toMatchObject({
      id: 10,
      site_name: 'Roy Hill',
      machine_manufacturer: 'Caterpillar',
      technology_supplier: 'Caterpillar',
      automation_level: 'autonomous',
      commissioning_year: 2021,
    })
  })

  it('filters, searches and sorts', async () => {
    const filtered = await request(app).get('/api/register?supplier=Caterpillar&sort=quantity&order=desc')
    expect(filtered.status).toBe(200)
    expect(filtered.body.total).toBe(2)
    expect(itemIds(filtered.body)).toEqual([10, 14])

    const searched = await request(app).get('/api/register?q=whale')
    expect(itemIds(searched.body)).toEqual([11])
  })

  it('pages with limit and offset while total covers every match', async () => {
    const response = await request(app).get('/api/register?limit=1&offset=1')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ total: 3, limit: 1, offset: 1 })
    expect(itemIds(response.body)).toEqual([10])
  })

  it('rejects invalid sort, order, limit and offset values', async () => {
    const cases: Array<[string, string]> = [
      ['sort=price', 'invalid sort parameter'],
      ['sort=toString', 'invalid sort parameter'],
      ['order=up', 'invalid order parameter'],
      ['limit=0', 'invalid limit parameter'],
      ['limit=501', 'invalid limit parameter'],
      ['limit=ten', 'invalid limit parameter'],
      ['offset=-1', 'invalid offset parameter'],
      ['country=AU&country=CA', 'invalid country parameter'],
    ]

    for (const [search, error] of cases) {
      const response = await request(app).get(`/api/register?${search}`)
      expect(response.status, search).toBe(400)
      expect(response.body, search).toEqual({ error })
    }
  })
})
