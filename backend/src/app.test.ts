import request from 'supertest'
import { describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test'

const { default: app } = await import('./app.js')

describe('GET /health', () => {
  it('returns 200 and status ok', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
