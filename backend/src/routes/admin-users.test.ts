import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase } = await import('../test/fixtures.js')
const { signedInAdmin, TEST_ADMIN_PASSWORD } = await import('../test/admin.js')

let rootCookie: string
let rootId: number

beforeEach(async () => {
  await resetDatabase()
  ;({ cookie: rootCookie, id: rootId } = await signedInAdmin(app, 'root@example.com', 'root'))
})

afterAll(async () => {
  await closeDatabase()
})

const asRoot = {
  get: () => request(app).get('/api/admin/users').set('Cookie', rootCookie),
  add: (body: unknown) => request(app).post('/api/admin/users').set('Cookie', rootCookie).set('X-Requested-With', 'fetch').send(body as object),
  setActive: (id: number | string, body: unknown) =>
    request(app).patch(`/api/admin/users/${id}`).set('Cookie', rootCookie).set('X-Requested-With', 'fetch').send(body as object),
}

const signIn = (email: string, password: string) =>
  request(app).post('/api/admin/session').set('X-Requested-With', 'fetch').send({ email, password })

describe('access', () => {
  it('returns 401 without a session', async () => {
    expect((await request(app).get('/api/admin/users')).status).toBe(401)
  })

  it('returns 403 to an administrator who is not root, for every route', async () => {
    const { cookie } = await signedInAdmin(app, 'reviewer@example.com', 'admin')
    const responses = await Promise.all([
      request(app).get('/api/admin/users').set('Cookie', cookie),
      request(app).post('/api/admin/users').set('Cookie', cookie).set('X-Requested-With', 'fetch').send({ email: 'x@example.com' }),
      request(app).patch(`/api/admin/users/${rootId}`).set('Cookie', cookie).set('X-Requested-With', 'fetch').send({ active: false }),
    ])
    expect(responses.map((response) => response.status)).toEqual([403, 403, 403])
    expect(responses[0]?.body).toEqual({ error: 'root administrator required' })
  })
})

describe('GET /api/admin/users', () => {
  it('lists every account, root first, without password hashes', async () => {
    await asRoot.add({ email: 'reviewer@example.com' })

    const response = await asRoot.get()

    expect(response.status).toBe(200)
    expect(response.body.items).toEqual([
      expect.objectContaining({ email: 'root@example.com', role: 'root', active: true, must_change_password: false }),
      expect.objectContaining({ email: 'reviewer@example.com', role: 'admin', active: true, must_change_password: true }),
    ])
    expect(JSON.stringify(response.body)).not.toContain('scrypt')
  })

  it('serialises created_at as ISO 8601 UTC with milliseconds, as before the Drizzle port', async () => {
    const response = await asRoot.get()

    expect(response.body.items[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('POST /api/admin/users', () => {
  it('adds an administrator with a temporary password that must be changed', async () => {
    const response = await asRoot.add({ email: 'New.Reviewer@Example.com' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: 'new.reviewer@example.com',
      role: 'admin',
      temporary_password: expect.stringMatching(/^[\w-]{16}$/),
    })

    const signedIn = await signIn('new.reviewer@example.com', response.body.temporary_password)
    expect(signedIn.status).toBe(200)
    expect(signedIn.body.must_change_password).toBe(true)
  })

  it('never creates a root account, whatever the body says', async () => {
    await asRoot.add({ email: 'sneaky@example.com', role: 'root' })
    expect(await query("SELECT role::text AS role FROM admin_user WHERE email = 'sneaky@example.com'")).toEqual([{ role: 'admin' }])
  })

  it('refuses an email that is already taken', async () => {
    const response = await asRoot.add({ email: 'ROOT@example.com' })
    expect(response.status).toBe(409)
  })

  it.each([[{}], [{ email: 'not-an-email' }]])('returns 400 for %j', async (body) => {
    const response = await asRoot.add(body)
    expect(response.status).toBe(400)
    expect(response.body.fields).toHaveProperty('email')
  })
})

describe('PATCH /api/admin/users/:id', () => {
  it('deactivates an administrator, ending their session, and reactivates them', async () => {
    const reviewer = await signedInAdmin(app, 'reviewer@example.com', 'admin')

    const deactivated = await asRoot.setActive(reviewer.id, { active: false })
    expect(deactivated.status).toBe(200)
    expect(deactivated.body).toEqual({ id: reviewer.id, active: false })
    expect((await request(app).get('/api/admin/session').set('Cookie', reviewer.cookie)).status).toBe(401)
    expect((await signIn('reviewer@example.com', TEST_ADMIN_PASSWORD)).status).toBe(401)

    expect((await asRoot.setActive(reviewer.id, { active: true })).status).toBe(200)
    expect((await signIn('reviewer@example.com', TEST_ADMIN_PASSWORD)).status).toBe(200)
  })

  it('cannot change a root account, including the signed-in root', async () => {
    const response = await asRoot.setActive(rootId, { active: false })
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'root accounts are managed from the command line' })
    expect(await query('SELECT active FROM admin_user WHERE id = $1', [rootId])).toEqual([{ active: true }])
  })

  it('returns 404 for an unknown account and 400 for an invalid body', async () => {
    expect((await asRoot.setActive(9999, { active: false })).status).toBe(404)
    expect((await asRoot.setActive('abc', { active: false })).status).toBe(404)
    expect((await asRoot.setActive(rootId, { active: 'no' })).status).toBe(400)
  })

  it('requires the X-Requested-With header', async () => {
    const response = await request(app).patch(`/api/admin/users/${rootId}`).set('Cookie', rootCookie).send({ active: false })
    expect(response.status).toBe(403)
  })
})
