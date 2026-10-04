export type CsvValue = string | number | null

function escapeCell(value: CsvValue): string {
  if (value === null) return ''
  let text = String(value)
  // Prefix spreadsheet formula triggers so contributed text cannot run as a formula
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** RFC 4180 CSV with CRLF line endings; null becomes an empty cell. */
export function toCsv(headers: readonly string[], rows: readonly CsvValue[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n'
}
