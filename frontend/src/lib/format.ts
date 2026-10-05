const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? 'Not recorded' : new Intl.NumberFormat('en-AU').format(value)
}

export function formatEnumLabel(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  const specialCases: Record<string, string> = { lhd: 'LHD', LHD: 'LHD' }
  if (specialCases[value]) return specialCases[value]
  const label = value.replaceAll('_', ' ').toLowerCase()
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatCountry(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  try {
    return regionNames.of(value.toUpperCase()) ?? value
  } catch {
    return value
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  if (/^\d{4}$/.test(value)) return value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return value
  return new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function formatCommissioning(date: string | null | undefined, year: number | null | undefined): string {
  if (date) return formatDate(date)
  return year === null || year === undefined ? 'Not recorded' : String(year)
}
