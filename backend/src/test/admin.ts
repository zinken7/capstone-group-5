import type { Application } from 'express'
import request from 'supertest'

import { changePassword, createAdmin } from '../services/admin-auth.js'

export const TEST_ADMIN_PASSWORD = 'a much longer password'

/** Creates an administrator with a changed password, signs in, and returns the id and session cookie. */
export async function signedInAdmin(app: Application, email = 'reviewer@example.com'): Promise<{ id: number; cookie: string }> {
  const created = await createAdmin(email, 'admin')
  if (created.kind !== 'created') throw new Error('admin was not created')
  await changePassword(created.id, created.temporaryPassword, TEST_ADMIN_PASSWORD)

  const response = await request(app)
    .post('/api/admin/session')
    .set('X-Requested-With', 'fetch')
    .send({ email, password: TEST_ADMIN_PASSWORD })
  const cookie = [response.headers['set-cookie']].flat().find((value) => value?.startsWith('admin_session='))?.split(';')[0]
  if (!cookie) throw new Error('no session cookie')
  return { id: created.id, cookie }
}
