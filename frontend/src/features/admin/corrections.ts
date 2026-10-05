import { formatDate, formatEnumLabel, formatNumber } from '../../lib/format'

/** A stored or proposed field value: counts, commissioning dates or years, and enum labels. */
export function describeValue(value: unknown): string {
  if (value === null || value === undefined) return 'Not recorded'
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'string') return /^\d{4}(-\d{2}-\d{2})?$/.test(value) ? formatDate(value) : formatEnumLabel(value)
  return String(value)
}

export function contributorOf(source: { contributorEmail: string | null; contributorOrganisation: string | null }): string {
  return [source.contributorEmail, source.contributorOrganisation].filter(Boolean).join(', ') || 'Anonymous contributor'
}
