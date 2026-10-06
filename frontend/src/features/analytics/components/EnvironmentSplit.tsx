import { useMemo, useState } from 'react'

import type { AnalyticsCrosstabDto } from '../../../lib/api/analytics'
import { formatEnumLabel, formatNumber } from '../../../lib/format'
import { ENVIRONMENTS, crosstabTotals, formatShare } from '../chartData'
import { BreakdownTable, ChartCard, EmptyChart, Legend } from './ChartCard'

// A segment shows its share inside only when the text fits comfortably
const LABEL_MIN_SHARE = 0.14

/** For each machine type, the share of machines working underground, at mixed sites and on the surface. */
function EnvironmentSplit({ crosstab, onFilter, limit = 8 }: { crosstab: AnalyticsCrosstabDto; onFilter: (key: string) => void; limit?: number }) {
  const [expanded, setExpanded] = useState(false)
  const allRows = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cell of crosstab.cells) counts.set(`${cell.row}\u0000${cell.column}`, cell.machine_count)
    return crosstabTotals(crosstab, 'row').map((row) => ({
      key: row.key,
      label: row.key === null ? 'Not recorded' : formatEnumLabel(row.key),
      total: row.value,
      segments: ENVIRONMENTS.map((environment) => {
        const value = counts.get(`${row.key}\u0000${environment.key}`) ?? 0
        return { ...environment, value, share: row.value ? value / row.value : 0 }
      }).filter((segment) => segment.value > 0),
    }))
  }, [crosstab])
  const rows = expanded ? allRows : allRows.slice(0, limit)
  const hidden = allRows.length - rows.length
  const legend = ENVIRONMENTS.filter((environment) => environment.key !== null || crosstab.cells.some((cell) => cell.column === null))

  return (
    <ChartCard
      id="environment"
      title="Underground or surface, by machine type"
      description="Share of each machine type's fleet by mining environment."
      table={(
        <BreakdownTable
          caption="Machines by machine type and mining environment"
          groupLabel="Machine type"
          extraColumns={legend.map((environment) => environment.label)}
          rows={allRows.map((row) => ({
            key: row.key ?? 'not-recorded',
            label: row.label,
            value: row.total,
            share: crosstab.machine_count ? row.total / crosstab.machine_count : 0,
            extra: legend.map((environment) => row.segments.find((segment) => segment.key === environment.key)?.value ?? 0),
          }))}
        />
      )}
    >
      {allRows.length === 0 ? <EmptyChart /> : (
        <>
          <Legend label="Mining environments" items={legend.map((environment) => ({ key: environment.key ?? 'none', label: environment.label, color: environment.color }))} />
          <ul className="split-list" aria-label="Mining environment by machine type">
            {rows.map((row) => {
              const description = `${row.label}, ${formatNumber(row.total)} machines: ${row.segments.map((segment) => `${formatShare(segment.share)} ${segment.label.toLowerCase()}`).join(', ')}`
              const content = (
                <>
                  <span className="split-list__label">{row.label}</span>
                  <span className="split-list__bar" aria-hidden="true">
                    {row.segments.map((segment) => (
                      <span key={segment.key ?? 'none'} style={{ flexGrow: segment.value, backgroundColor: segment.color, color: segment.ink }} title={`${segment.label}: ${formatNumber(segment.value)} (${formatShare(segment.share)})`}>
                        {segment.share >= LABEL_MIN_SHARE ? formatShare(segment.share) : ''}
                      </span>
                    ))}
                  </span>
                  <span className="split-list__total">{formatNumber(row.total)}</span>
                </>
              )
              return (
                <li key={row.key ?? 'not-recorded'}>
                  {row.key
                    ? <button className="split-list__row split-list__row--action" type="button" aria-label={`Filter by ${description}`} onClick={() => onFilter(row.key as string)}>{content}</button>
                    : <div className="split-list__row" aria-label={description}>{content}</div>}
                </li>
              )
            })}
          </ul>
          {allRows.length > limit && (
            <button className="chart-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
              {expanded ? `Show the top ${limit} only` : `Show the other ${hidden} machine ${hidden === 1 ? 'type' : 'types'}`}
            </button>
          )}
        </>
      )}
    </ChartCard>
  )
}

export default EnvironmentSplit
