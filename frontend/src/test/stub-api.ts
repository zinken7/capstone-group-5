import { vi } from 'vitest'

export type Handler = (body: unknown) => Response
export interface Call { key: string; body: unknown; headers: Headers }

/**
 * Stubs fetch with handlers keyed by "METHOD /path". A list of handlers answers
 * successive calls, repeating the last one; unknown requests fail loudly.
 */
export function stubApi(routes: Record<string, Handler | Handler[]>): Call[] {
  const calls: Call[] = []
  const queues = new Map(Object.entries(routes).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]))
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ key, body, headers: new Headers(init?.headers) })
    const entry = queues.get(key)
    const handler = Array.isArray(entry) ? (entry.length > 1 ? entry.shift() : entry[0]) : entry
    return handler ? handler(body) : Response.json({ error: `unexpected request ${key}` }, { status: 500 })
  }))
  return calls
}
