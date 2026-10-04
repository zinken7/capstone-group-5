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
      model_variant: null,
      technology_supplier: 'Caterpillar',
      automation_level: 'autonomous',
      commissioning_year: 2021,
    })
  })

  it('preserves an explicit base variant in JSON and CSV alongside unknown variants', async () => {
    await query("UPDATE machine_model SET model_variant = 'base' WHERE id = 1")

    const response = await request(app).get('/api/register')
    expect(response.status).toBe(200)
    expect(response.body.items[1]).toMatchObject({ id: 10, model_variant: 'base' })
    expect(response.body.items[0]).toMatchObject({ id: 11, model_variant: null })

    const exported = await request(app).get('/api/register/export')
    expect(exported.status).toBe(200)
    expect(exported.text).toContain('Caterpillar 793F,base,haul_truck')
    expect(exported.text).toContain('Sandvik,,,drill')
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

describe('GET /api/register/export', () => {
  it('downloads every matching verified deployment as CSV', async () => {
    const response = await request(app).get('/api/register/export?supplier=Caterpillar&sort=quantity&order=desc')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8')
    expect(response.headers['content-disposition']).toContain('autonomous-mining-equipment.csv')

    const lines = response.text.trimEnd().split('\r\n')
    expect(lines[0]).toBe(
      'id,site_id,site_name,country_code,region,commodity,machine_manufacturer,machine_model,model_variant,' +
      'machine_type,quantity,technology_supplier,technology_product,automation_level,environment,' +
      'installation_type,status,commissioning_date,commissioning_year,valid_from,valid_to',
    )
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe(
      '10,1,Roy Hill,AU,Pilbara,iron_ore,Caterpillar,Caterpillar 793F,,haul_truck,96,' +
      'Caterpillar,Cat MineStar Command for hauling,autonomous,surface,unknown,operational,2021-01-01,2021,2021-01-01,',
    )
    expect(lines[2]?.startsWith('14,')).toBe(true)
  })

  it('is not paged', async () => {
    const response = await request(app).get('/api/register/export?limit=1')

    expect(response.status).toBe(200)
    expect(response.text.trimEnd().split('\r\n')).toHaveLength(4)
  })

  it('rejects an invalid sort parameter', async () => {
    const response = await request(app).get('/api/register/export?sort=price')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid sort parameter' })
  })
})
