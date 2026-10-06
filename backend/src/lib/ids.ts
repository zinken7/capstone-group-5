/** A positive integer path id, or null for anything else. */
export function parseId(raw: unknown): number | null {
  if (typeof raw !== 'string') return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
