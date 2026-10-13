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

describe('GET /api/sites/:id', () => {
  it('names the supplier of a deployment that has no product', async () => {
    await query('UPDATE deployment SET technology_product_id = NULL WHERE id = 11')

    const response = await request(app).get('/api/sites/2')
    expect(response.body.deployments).toEqual([expect.objectContaining({ id: 11, technology_supplier: 'RCT' })])
  })

  it('returns full detail for an existing site, with only verified deployments', async () => {
    const response = await request(app).get('/api/sites/1')

    expect(response.status).toBe(200)
    expect(response.body.name).toBe('Roy Hill')
    const deploymentIds = response.body.deployments.map((deployment: { id: number }) => deployment.id).sort()
    expect(deploymentIds).toEqual([10, 14])
  })

  it('gives each deployment its commissioning year, so a year-only record can be placed in time', async () => {
    const response = await request(app).get('/api/sites/1')

    const years = response.body.deployments.map((deployment: { id: number; commissioning_year: number | null }) => [deployment.id, deployment.commissioning_year])
    expect(years.sort()).toEqual([[10, 2021], [14, 2015]])
  })

  it('returns 404 for a site whose only deployment is not verified', async () => {
    const response = await request(app).get('/api/sites/3')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'site not found' })
  })

  it('returns 404 for a site created by a contribution that is not yet verified', async () => {
    const contribution = await request(app).post('/api/contributions').send({
      site_name: 'Unreviewed Pit',
      country_code: 'AU',
      machine_type: 'drill',
      machine_manufacturer: 'Epiroc',
      quantity: 2,
      disclosure_accepted: true,
    })
    const [site] = await query<{ id: number }>(
      'SELECT site_id::int AS id FROM deployment WHERE id = $1',
      [contribution.body.id],
    )

    const response = await request(app).get(`/api/sites/${site?.id}`)
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'site not found' })
  })

  it('returns 404 for a site that does not exist', async () => {
    const response = await request(app).get('/api/sites/999')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'site not found' })
  })

  it('returns 404 for an id that is not a positive integer', async () => {
    for (const id of ['abc', '1.5', '-1', '99999999999999999999']) {
      const response = await request(app).get(`/api/sites/${id}`)

      expect(response.status).toBe(404)
      expect(response.body).toEqual({ error: 'site not found' })
    }
  })
})
