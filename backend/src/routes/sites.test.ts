import request from 'supertest'
import { describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test'

const { default: app } = await import('../app.js')

describe('GET /api/sites/:id', () => {
  it('returns full detail for an existing site, with only verified deployments', async () => {
    const response = await request(app).get('/api/sites/1')

    expect(response.status).toBe(200)
    expect(response.body.name).toBe('Roy Hill')
    const deploymentIds = response.body.deployments.map((deployment: { id: number }) => deployment.id).sort()
    expect(deploymentIds).toEqual([10, 14])
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
})
