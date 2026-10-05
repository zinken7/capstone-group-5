import express from 'express'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const { default: app } = await import('../app.js')
const { closeDatabase, query } = await import('../database.js')
const { resetDatabase } = await import('../test/fixtures.js')
const { createAdmin, changePassword } = await import('../services/admin-auth.js')
const { currentAdmin, requireAdmin } = await import('../middleware/require-admin.js')

beforeEach(async () => {
  await resetDatabase()
})

afterAll(async () => {
  await closeDatabase()
})

const NEW_PASSWORD = 'a much longer password'

/** Creates an administrator and returns the temporary password. */
async function newAdmin(email = 'reviewer@example.com', role: 'root' | 'admin' = 'admin'): Promise<string> {
  const outcome = await createAdmin(email, role)
  if (outcome.kind !== 'created') throw new Error('admin was not created')
  return outcome.temporaryPassword
}

/** Signs in and returns the session cookie. */
async function signIn(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/admin/session')
    .set('X-Requested-With', 'fetch')
    .send({ email, password })
  expect(response.status).toBe(200)
  const cookie = [response.headers['set-cookie']].flat().find((value) => value?.startsWith('admin_session='))
  if (!cookie) throw new Error('no session cookie')
  return cookie.split(';')[0] ?? ''
}

/** An administrator whose temporary password has already been changed. */
async function activeAdminCookie(email = 'reviewer@example.com'): Promise<string> {
  const temporary = await newAdmin(email)
  const [{ id }] = await query<{ id: number }>('SELECT id::int AS id FROM admin_user WHERE email = $1', [email]) as [{ id: number }]
  await changePassword(id, temporary, NEW_PASSWORD)
  return signIn(email, NEW_PASSWORD)
}

describe('createAdmin', () => {
  it('stores a lower-case email, the role and a temporary password that must be changed', async () => {
    await newAdmin('Root.Admin@Example.com', 'root')

    expect(await query('SELECT email, role, active, must_change_password FROM admin_user')).toEqual([
      { email: 'root.admin@example.com', role: 'root', active: true, must_change_password: true },
    ])
  })

  it('refuses a second account with the same email in any case', async () => {
    await newAdmin('reviewer@example.com')
    await expect(createAdmin('REVIEWER@example.com', 'admin')).resolves.toEqual({ kind: 'exists' })
  })
})

describe('POST /api/admin/session', () => {
  it('signs in and sets a strict, HTTP-only session cookie on the admin path', async () => {
    const temporary = await newAdmin()

    const response = await request(app)
      .post('/api/admin/session')
      .set('X-Requested-With', 'fetch')
      .send({ email: 'Reviewer@Example.com', password: temporary })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ email: 'reviewer@example.com', role: 'admin', must_change_password: true })
    const cookie = [response.headers['set-cookie']].flat().join(';')
    expect(cookie).toMatch(/admin_session=[\w-]+\.[\w-]+/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Strict/)
    expect(cookie).toMatch(/Path=\/api\/admin/)
    expect(cookie).toMatch(/Max-Age=28800/)
  })

  it('gives the same answer for a wrong password, an unknown email and a deactivated account', async () => {
    const temporary = await newAdmin()
    await newAdmin('former@example.com')
    await query("UPDATE admin_user SET active = false WHERE email = 'former@example.com'")

    for (const [email, password] of [
      ['reviewer@example.com', 'wrong password'],
      ['nobody@example.com', temporary],
      ['former@example.com', temporary],
    ]) {
      const response = await request(app).post('/api/admin/session').set('X-Requested-With', 'fetch').send({ email, password })
      expect(response.status).toBe(401)
      expect(response.body).toEqual({ error: 'incorrect email or password' })
      expect(response.headers['set-cookie']).toBeUndefined()
    }
  })

  it('requires the X-Requested-With header', async () => {
    const temporary = await newAdmin()
    const response = await request(app).post('/api/admin/session').send({ email: 'reviewer@example.com', password: temporary })
    expect(response.status).toBe(403)
  })

  it('returns 400 without an email or password', async () => {
    const response = await request(app).post('/api/admin/session').set('X-Requested-With', 'fetch').send({ email: 'a@b.c' })
    expect(response.status).toBe(400)
  })
})

describe('GET /api/admin/session', () => {
  it('returns the signed-in administrator', async () => {
    const cookie = await activeAdminCookie()
    const response = await request(app).get('/api/admin/session').set('Cookie', cookie)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ email: 'reviewer@example.com', role: 'admin', must_change_password: false })
  })

  it('returns 401 without a session or with a tampered one', async () => {
    const cookie = await activeAdminCookie()
    const tampered = `${cookie.slice(0, -2)}xx`

    for (const header of [undefined, tampered, 'admin_session=garbage']) {
      const req = request(app).get('/api/admin/session')
      const response = await (header ? req.set('Cookie', header) : req)
      expect(response.status).toBe(401)
    }
  })

  it('ends the session as soon as the account is deactivated', async () => {
    const cookie = await activeAdminCookie()
    await query('UPDATE admin_user SET active = false')
    const response = await request(app).get('/api/admin/session').set('Cookie', cookie)
    expect(response.status).toBe(401)
  })
})

describe('DELETE /api/admin/session', () => {
  it('clears the session cookie', async () => {
    const cookie = await activeAdminCookie()
    const response = await request(app).delete('/api/admin/session').set('Cookie', cookie).set('X-Requested-With', 'fetch')
    expect(response.status).toBe(204)
    expect([response.headers['set-cookie']].flat().join(';')).toMatch(/admin_session=;.*Expires=Thu, 01 Jan 1970/)
  })
})

describe('POST /api/admin/password', () => {
  it('replaces the temporary password, clears the flag and ends the old session', async () => {
    const temporary = await newAdmin()
    const oldCookie = await signIn('reviewer@example.com', temporary)

    const response = await request(app)
      .post('/api/admin/password')
      .set('Cookie', oldCookie)
      .set('X-Requested-With', 'fetch')
      .send({ current_password: temporary, new_password: NEW_PASSWORD })

    expect(response.status).toBe(200)
    expect(response.body.must_change_password).toBe(false)
    const newCookie = [response.headers['set-cookie']].flat().find((value) => value?.startsWith('admin_session='))?.split(';')[0] ?? ''

    expect((await request(app).get('/api/admin/session').set('Cookie', oldCookie)).status).toBe(401)
    expect((await request(app).get('/api/admin/session').set('Cookie', newCookie)).status).toBe(200)
    await signIn('reviewer@example.com', NEW_PASSWORD)
  })

  it.each([
    [{ current_password: 'wrong password', new_password: NEW_PASSWORD }, 'current password is incorrect'],
    [{ current_password: 'TEMPORARY', new_password: 'too short' }, 'new password must be at least 12 characters'],
    [{ current_password: 'TEMPORARY', new_password: 'TEMPORARY' }, 'new password must differ from the current password'],
    [{ current_password: 'TEMPORARY' }, 'current_password and new_password are required'],
  ])('returns 400 for %j', async (body, error) => {
    const temporary = await newAdmin()
    const cookie = await signIn('reviewer@example.com', temporary)
    const filled = JSON.parse(JSON.stringify(body).replaceAll('TEMPORARY', temporary))

    const response = await request(app).post('/api/admin/password').set('Cookie', cookie).set('X-Requested-With', 'fetch').send(filled)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error })
  })
})

describe('requireAdmin', () => {
  const protectedApp = express()
  protectedApp.use(express.json())
  protectedApp.get('/api/admin/probe', ...requireAdmin(), (_req, res) => {
    res.json({ email: currentAdmin(res).email })
  })
  protectedApp.post('/api/admin/probe', ...requireAdmin(), (_req, res) => {
    res.json({ ok: true })
  })

  it('refuses every other admin route until the temporary password is changed', async () => {
    const temporary = await newAdmin()
    const cookie = await signIn('reviewer@example.com', temporary)

    const response = await request(protectedApp).get('/api/admin/probe').set('Cookie', cookie)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'password change required' })
  })

  it('lets an administrator with a changed password through', async () => {
    const cookie = await activeAdminCookie()
    const response = await request(protectedApp).get('/api/admin/probe').set('Cookie', cookie)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ email: 'reviewer@example.com' })
  })

  it('refuses a modifying request without the X-Requested-With header, even with a session', async () => {
    const cookie = await activeAdminCookie()
    const response = await request(protectedApp).post('/api/admin/probe').set('Cookie', cookie).send({})
    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'missing X-Requested-With: fetch header' })
  })
})
