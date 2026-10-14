export class ApiError extends Error {
  readonly status: number | undefined
  /** Messages for individual request fields, keyed by API field name, when the API names them. */
  readonly fields: Record<string, string>

  constructor(message: string, status?: number, options?: ErrorOptions & { fields?: Record<string, string> }) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.fields = options?.fields ?? {}
  }
}

/** The string messages in an error body's `fields` object; anything else is ignored. */
export function fieldMessages(body: unknown): Record<string, string> {
  const fields = typeof body === 'object' && body !== null && 'fields' in body ? body.fields : null
  if (typeof fields !== 'object' || fields === null) return {}
  return Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}
