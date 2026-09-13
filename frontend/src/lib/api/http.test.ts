import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './errors'
import { requestJson } from './http'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('requestJson', () => {
  it('returns successful JSON from the default same-origin API base', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 1 }))

    const result = await requestJson<{ id: number }>('sites/1')

    expect(result).toEqual({ id: 1 })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/sites/1')
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Accept')).toBe('application/json')
  })

  it.each([
    ['https://staging.example.com/api/', 'https://staging.example.com/api/sites/1'],
    ['/gateway/api/', '/gateway/api/sites/1'],
    ['/', '/sites/1'],
    ['   ', '/api/sites/1'],
  ])('resolves paths against API base %s', async (base, expected) => {
    vi.stubEnv('VITE_API_BASE_URL', base)
    fetchMock.mockResolvedValue(Response.json({ id: 1 }))

    await requestJson('/sites/1')

    expect(fetchMock.mock.calls[0][0]).toBe(expected)
  })

  it('forwards request options and caller headers', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 1 }))
    const signal = new AbortController().signal
    const body = JSON.stringify({ name: 'Example' })

    await requestJson('example', {
      method: 'POST', body, signal, headers: { 'Content-Type': 'application/json' },
    })

    const options = fetchMock.mock.calls[0][1]
    expect(options).toMatchObject({ method: 'POST', body, signal })
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json')
  })

  it('represents non-2xx responses as ApiError with the backend message and status', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'invalid bbox parameter' }, { status: 400 }))

    const error = await requestJson('map').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'invalid bbox parameter' })
  })

  it.each(['<html>Bad gateway</html>', '', '{"error":42}'])(
    'preserves HTTP errors when the body has no usable JSON error message: %s', async (body) => {
      fetchMock.mockResolvedValue(new Response(body, { status: 502 }))

      await expect(requestJson('map')).rejects.toMatchObject({
        name: 'ApiError', status: 502, message: 'API request failed (502)',
      })
    },
  )

  it('wraps network failures with their cause and no HTTP status', async () => {
    const cause = new TypeError('Failed to fetch')
    fetchMock.mockRejectedValue(cause)

    const error = await requestJson('map').catch((failure: unknown) => failure)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: undefined, cause })
  })

  it('wraps unreadable successful JSON with the available HTTP status', async () => {
    fetchMock.mockResolvedValue(new Response('not JSON', { status: 200 }))

    await expect(requestJson('map')).rejects.toMatchObject({
      name: 'ApiError', status: 200, message: 'Unable to read API JSON response',
    })
  })
})
