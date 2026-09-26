/** Formats numeric input as the Australian English date format: DD/MM/YYYY. */
export function formatAustralianDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Converts a valid DD/MM/YYYY value to the ISO format expected by the API. */
export function parseAustralianDate(value: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (match === null) return undefined

  const [, day, month, year] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return undefined
  }

  return `${year}-${month}-${day}`
}
