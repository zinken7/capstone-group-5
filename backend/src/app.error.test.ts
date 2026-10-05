import request from 'supertest'
import { afterAll, describe, expect, it, vi } from 'vitest'

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test'

vi.mock('./repositories/sites.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./repositories/sites.js')>()
  return { ...actual, findSiteById: vi.fn() }
})

const { DrizzleQueryError } = await import('drizzle-orm')
const { default: app } = await import('./app.js')
const { closeDatabase } = await import('./database.js')
const { findSiteById } = await import('./repositories/sites.js')

afterAll(async () => {
  await closeDatabase()
})

describe('route errors', () => {
  it('logs the database reason behind a wrapped query failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const cause = new Error('connection refused')
    vi.mocked(findSiteById).mockRejectedValueOnce(new DrizzleQueryError('select 1', [], cause))

    const response = await request(app).get('/api/sites/1')

    expect(response.status).toBe(500)
    expect(spy.mock.calls.flat()).toContain(cause)
    spy.mockRestore()
  })
})
