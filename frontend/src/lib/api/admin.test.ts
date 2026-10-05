import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { correctRecord, getSession, signIn, signOut, submitDecision } from './admin'
import { ApiError } from './errors'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', '/api')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const headersOf = (call = 0) => new Headers(fetchMock.mock.calls[call]?.[1]?.headers)

describe('admin API client', () => {
  it('sends the CSRF header on modifying requests and maps the profile', async () => {
    fetchMock.mockResolvedValue(Response.json({ email: 'a@b.c', role: 'admin', must_change_password: true }))

    await expect(signIn('a@b.c', 'secret')).resolves.toEqual({ email: 'a@b.c', role: 'admin', mustChangePassword: true })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/admin/session')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(headersOf().get('X-Requested-With')).toBe('fetch')
  })

  it('treats 401 from the session endpoint as signed out', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'sign in required' }, { status: 401 }))
    await expect(getSession()).resolves.toBeNull()
  })

  it('passes other session errors on', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'administrator sign-in is not configured' }, { status: 503 }))
    await expect(getSession()).rejects.toBeInstanceOf(ApiError)
  })

  it('signs out with DELETE and accepts an empty response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(signOut()).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE')
    expect(headersOf().get('X-Requested-With')).toBe('fetch')
  })

  it('sends a decision with a blank note as null', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 1, verification_status: 'verified' }, { status: 201 }))

    await expect(submitDecision(12, 'approved', '   ')).resolves.toBe('verified')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/admin/deployments/12/reviews')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ decision: 'approved', note: null })
  })

  it('sends only the corrected fields, in API names', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 12, verification_status: 'pending_review' }))

    await correctRecord(12, { quantity: 9, technologySupplier: 'RCT', technologyProduct: 'ControlMaster' })

    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      quantity: 9,
      technology_supplier: 'RCT',
      technology_product: 'ControlMaster',
    })
  })
})
