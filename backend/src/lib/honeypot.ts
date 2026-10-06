/** Hidden form field that people never see; automated submitters tend to fill it (FR-51). */
export const HONEYPOT_FIELD = 'website'

/** True when a request body has the honeypot field filled with anything other than blank text. */
export function honeypotFilled(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD]
  if (value === undefined || value === null) return false
  return typeof value !== 'string' || value.trim() !== ''
}
