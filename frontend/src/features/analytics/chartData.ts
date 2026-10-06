import type { AnalyticsBreakdownItemDto, AnalyticsCrosstabDto } from '../../lib/api/analytics'
import { formatEnumLabel, formatNumber } from '../../lib/format'

export interface ChartRow {
  key: string | null
  label: string
  value: number
  share: number
}

export const BRAND = '#27348b'
export const GRID = '#e6eaf0'
export const AXIS_TEXT = '#536078'

// Automation levels are ordered, so they share one hue from light (least automated) to dark (most automated)
export const AUTOMATION_LEVELS = ['operator_assistance', 'teleremote', 'semi_autonomous', 'autonomous'] as const
export const AUTOMATION_RAMP: Record<string, string> = {
  operator_assistance: '#9aa6e8',
  teleremote: '#6b7cd8',
  semi_autonomous: '#4558c0',
  autonomous: '#27348b',
}
export const UNCLASSIFIED_COLOR = '#b3bac5'

// Underground and surface are the two poles; mixed sites sit in the neutral middle
export const ENVIRONMENTS = [
  { key: 'underground', label: 'Underground', color: '#27348b', ink: '#ffffff' },
  { key: 'both', label: 'Surface and underground', color: '#c3c8d2', ink: '#14213d' },
  { key: 'surface', label: 'Surface', color: '#b8860b', ink: '#14213d' },
  { key: null, label: 'Not recorded', color: '#e6e9ee', ink: '#14213d' },
] as const

// Heatmap bins, light to dark; the darker three carry white numbers
export const HEAT_RAMP = ['#a3aeea', '#7d8de0', '#5a6dd0', '#3a4bb0', '#1f2a78'] as const

export function formatShare(share: number): string {
  if (share > 0 && share < 0.005) return '<1%'
  return `${Math.round(share * 100)}%`
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
}

export function automationLabel(key: string | null): string {
  return key === null ? 'Unclassified' : formatEnumLabel(key)
}

export function toRows(items: AnalyticsBreakdownItemDto[], label: (key: string | null) => string): ChartRow[] {
  return items.map((item) => ({ key: item.key, label: label(item.key), value: item.machine_count, share: item.share }))
}

export function byValue(rows: ChartRow[]): ChartRow[] {
  return [...rows].sort((a, b) => b.value - a.value)
}

/** Totals per row or per column key, largest first with the unknown group last. */
export function crosstabTotals(crosstab: AnalyticsCrosstabDto, axis: 'row' | 'column'): Array<{ key: string | null; value: number }> {
  const totals = new Map<string | null, number>()
  for (const cell of crosstab.cells) totals.set(cell[axis], (totals.get(cell[axis]) ?? 0) + cell.machine_count)
  return Array.from(totals, ([key, value]) => ({ key, value }))
    .sort((a, b) => Number(a.key === null) - Number(b.key === null) || b.value - a.value)
}

export function emptyCrosstab(rows: AnalyticsCrosstabDto['rows'], columns: AnalyticsCrosstabDto['columns']): AnalyticsCrosstabDto {
  return { rows, columns, machine_count: 0, cells: [] }
}
