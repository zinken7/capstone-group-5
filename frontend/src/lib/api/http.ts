import { getApiBaseUrl } from './config'
import { ApiError, fieldMessages } from './errors'

/** Request a JSON endpoint using a path relative to the configured API base. */
export async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}/${path.replace(/^\/+/, '')}`
  const headers = new Headers(options?.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  let response: Response
  try {
    response = await fetch(url, { ...options, headers })
  } catch (cause) {
    throw new ApiError('Unable to reach the API', undefined, { cause })
  }

  if (!response.ok) {
    let message = `API request failed (${response.status})`
    let fields: Record<string, string> = {}
    // Error bodies may be empty or non-JSON (for example, a proxy error).
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null && 'error' in body &&
          typeof body.error === 'string' && body.error.trim()) {
        message = body.error
      }
      fields = fieldMessages(body)
    } catch {
      // Keep the HTTP status and fallback message when the body cannot be read.
    }
    throw new ApiError(message, response.status, { fields })
  }

  // No content, for example after signing out
  if (response.status === 204) return undefined as T

  try {
    return await response.json() as T
  } catch (cause) {
    throw new ApiError('Unable to read API JSON response', response.status, { cause })
  }
}
