import { useState } from 'react'

import { formatNumber } from '../../../lib/format'
import { formatShare, plural } from '../chartData'
import type { ChartRow } from '../chartData'
import { EmptyChart } from './ChartCard'

function BarList({ name, rows, limit, noun, onFilter }: {
  name: string
  rows: ChartRow[]
  limit?: number
  /** Singular and plural names for the rows hidden behind "Show the other …" */
  noun?: readonly [string, string]
  onFilter?: (key: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  if (rows.length === 0) return <EmptyChart />
  const hidden = limit ? Math.max(0, rows.length - limit) : 0
  const visible = hidden > 0 && !expanded ? rows.slice(0, limit) : rows
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <>
      <ul className="bar-list" aria-label={name}>
        {visible.map((row) => {
          const share = formatShare(row.share)
          const content = (
            <>
              <span className="bar-list__label">{row.label}</span>
              <span className="bar-list__track" aria-hidden="true"><span className="bar-list__bar" style={{ width: `${(row.value / max) * 100}%` }} /></span>
              <span className="bar-list__value"><strong>{formatNumber(row.value)}</strong><span>{share}</span></span>
            </>
          )
          return (
            // A stable key keeps the selected row, and its keyboard focus, when the filtered list re-renders
            <li key={row.key ?? `not-recorded-${row.label}`}>
              {onFilter && row.key
                ? <button className="bar-list__row bar-list__row--action" type="button" aria-label={`Filter by ${row.label}: ${formatNumber(row.value)} machines, ${share}`} onClick={() => onFilter(row.key as string)}>{content}</button>
                : <div className="bar-list__row">{content}</div>}
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <button className="chart-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? `Show the top ${limit} only` : `Show the other ${plural(hidden, noun?.[0] ?? 'group', noun?.[1])}`}
        </button>
      )}
    </>
  )
}

export default BarList
