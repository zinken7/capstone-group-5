/** "pending_review" → "Pending review". */
export function humanise(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  const text = value.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const dateTime = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTime.format(date)
}

/** Full date when known, otherwise the year alone. */
export function formatCommissioning(date: string | null, year: number | null): string {
  if (date) return date
  return year === null ? 'Not recorded' : String(year)
}

/** A stored or proposed field value: enum values read as words, missing values as "Not recorded". */
export function describeValue(value: unknown): string {
  if (value === null || value === undefined) return 'Not recorded'
  return typeof value === 'string' ? humanise(value) : String(value)
}

export function contributorOf(source: { contributorEmail: string | null; contributorOrganisation: string | null }): string {
  return [source.contributorEmail, source.contributorOrganisation].filter(Boolean).join(', ') || 'Anonymous contributor'
}
