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

describe('GET /api/sites/:id', () => {
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

  it('returns an empty deployment list when the only deployment is not verified', async () => {
    const response = await request(app).get('/api/sites/3')

    expect(response.status).toBe(200)
    expect(response.body.deployments).toEqual([])
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
