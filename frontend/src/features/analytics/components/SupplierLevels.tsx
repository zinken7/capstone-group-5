import { useMemo, useState } from 'react'

import type { AnalyticsCrosstabDto } from '../../../lib/api/analytics'
import { formatNumber } from '../../../lib/format'
import { AUTOMATION_LEVELS, AUTOMATION_RAMP, UNCLASSIFIED_COLOR, automationLabel, crosstabTotals, formatShare } from '../chartData'
import { BreakdownTable, ChartCard, EmptyChart, Legend } from './ChartCard'

function colorFor(level: string | null): string {
  return level ? AUTOMATION_RAMP[level] ?? UNCLASSIFIED_COLOR : UNCLASSIFIED_COLOR
}

/** Machines per technology supplier, each bar split by the automation level of the technology supplied. */
function SupplierLevels({ crosstab, limit = 8, onFilter }: { crosstab: AnalyticsCrosstabDto; limit?: number; onFilter: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const { allRows, levels, max } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cell of crosstab.cells) counts.set(`${cell.row}\u0000${cell.column}`, cell.machine_count)
    const present = new Set(crosstab.cells.map((cell) => cell.column))
    const ordered = [...AUTOMATION_LEVELS, null].filter((level) => present.has(level))
    const totals = crosstabTotals(crosstab, 'row')
    return {
      levels: ordered,
      max: Math.max(1, ...totals.map((row) => row.value)),
      allRows: totals.map((row) => ({
        key: row.key,
        label: row.key ?? 'Not recorded',
        total: row.value,
        share: crosstab.machine_count ? row.value / crosstab.machine_count : 0,
        counts: ordered.map((level) => counts.get(`${row.key}\u0000${level}`) ?? 0),
      })),
    }
  }, [crosstab])
  const rows = expanded ? allRows : allRows.slice(0, limit)
  const hidden = allRows.length - rows.length

  return (
    <ChartCard
      id="supplier"
      title="Machines by technology supplier"
      description="Who supplies the most machines, and at which automation level."
      table={(
        <BreakdownTable
          caption="Machines by technology supplier and automation level"
          groupLabel="Technology supplier"
          extraColumns={levels.map((level) => automationLabel(level))}
          rows={allRows.map((row) => ({ key: row.key ?? 'not-recorded', label: row.label, value: row.total, share: row.share, extra: row.counts }))}
        />
      )}
    >
      {allRows.length === 0 ? <EmptyChart /> : (
        <>
          <Legend label="Automation levels" items={levels.map((level) => ({ key: level ?? 'unclassified', label: automationLabel(level), color: colorFor(level) }))} />
          <ul className="stack-list" aria-label="Machines by technology supplier">
            {rows.map((row) => {
              const share = formatShare(row.share)
              const segments = levels.map((level, index) => ({ level, value: row.counts[index] ?? 0 })).filter((segment) => segment.value > 0)
              const mix = segments.map((segment) => `${formatShare(segment.value / row.total)} ${automationLabel(segment.level).toLowerCase()}`).join(', ')
              const content = (
                <>
                  <span className="stack-list__label">{row.label}</span>
                  <span className="stack-list__track" aria-hidden="true">
                    <span className="stack-list__bar" style={{ width: `${(row.total / max) * 100}%` }}>
                      {segments.map((segment) => <span key={segment.level ?? 'unclassified'} style={{ flexGrow: segment.value, backgroundColor: colorFor(segment.level) }} title={`${automationLabel(segment.level)}: ${formatNumber(segment.value)}`} />)}
                    </span>
                  </span>
                  <span className="stack-list__value"><strong>{formatNumber(row.total)}</strong><span>{share}</span></span>
                </>
              )
              return (
                <li key={row.key ?? 'not-recorded'}>
                  {row.key
                    ? <button className="stack-list__row stack-list__row--action" type="button" aria-label={`Filter by ${row.label}: ${formatNumber(row.total)} machines, ${share}; ${mix}`} onClick={() => onFilter(row.key as string)}>{content}</button>
                    : <div className="stack-list__row" aria-label={`${row.label}: ${formatNumber(row.total)} machines, ${share}; ${mix}`}>{content}</div>}
                </li>
              )
            })}
          </ul>
          {allRows.length > limit && (
            <button className="chart-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
              {expanded ? `Show the top ${limit} only` : `Show the other ${hidden} ${hidden === 1 ? 'supplier' : 'suppliers'}`}
            </button>
          )}
        </>
      )}
    </ChartCard>
  )
}

export default SupplierLevels
