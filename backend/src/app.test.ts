import request from 'supertest'
import { describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test'

const { default: app } = await import('./app.js')

describe('request body errors', () => {
  it('answers malformed JSON with a JSON 400', async () => {
    const response = await request(app)
      .post('/api/contributions')
      .set('Content-Type', 'application/json')
      .send('{"site_name": ')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'invalid JSON body' })
  })

  it('answers an oversized body with a JSON 413', async () => {
    const response = await request(app)
      .post('/api/contributions')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ notes: 'x'.repeat(200_000) }))

    expect(response.status).toBe(413)
    expect(response.body).toEqual({ error: 'request body too large' })
  })
})

describe('GET /health', () => {
  it('returns 200 and status ok', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
