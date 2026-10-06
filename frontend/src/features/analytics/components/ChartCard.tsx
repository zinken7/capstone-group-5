import { useState } from 'react'
import type { ReactNode } from 'react'

import { formatNumber } from '../../../lib/format'
import { formatShare } from '../chartData'

/** A chart card; given a table, it adds a toggle that swaps the chart for that table. */
export function ChartCard({ id, title, description, actions, note, table, className = '', children }: {
  id: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  note?: ReactNode
  table?: ReactNode
  className?: string
  children: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  const headingId = `analytics-${id}-heading`
  const toggle = table ? <TableToggle table={showTable} onToggle={() => setShowTable((current) => !current)} /> : null
  return (
    <section className={`chart-card ${className}`.trim()} aria-labelledby={headingId}>
      <header className="chart-card__header">
        <div>
          <h2 id={headingId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {(actions || toggle) && <div className="chart-card__actions">{actions}{toggle}</div>}
      </header>
      {table && showTable ? table : children}
      {note && <p className="chart-card__note">{note}</p>}
    </section>
  )
}

export interface TableRow {
  key: string
  label: string
  value: number
  share: number
  /** Extra counts, one per extra column */
  extra?: number[]
}

/** The full breakdown behind a chart, every group with its machines and share. */
export function BreakdownTable({ caption, groupLabel, rows, extraColumns = [] }: { caption: string; groupLabel: string; rows: TableRow[]; extraColumns?: string[] }) {
  if (rows.length === 0) return <EmptyChart />
  return (
    <div className="chart-table-wrap">
      <table className="chart-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{groupLabel}</th>
            {extraColumns.map((column) => <th scope="col" className="numeric" key={column}>{column}</th>)}
            <th scope="col" className="numeric">Machines</th>
            <th scope="col" className="numeric">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {extraColumns.map((column, index) => <td className="numeric" key={column}>{formatNumber(row.extra?.[index] ?? 0)}</td>)}
              <td className="numeric">{formatNumber(row.value)}</td>
              <td className="numeric">{formatShare(row.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmptyChart({ message = 'No machines match these filters.' }: { message?: string }) {
  return <p className="chart-empty">{message}</p>
}

export function TableToggle({ table, onToggle }: { table: boolean; onToggle: () => void }) {
  return (
    <button className="chart-toggle" type="button" aria-pressed={table} onClick={onToggle}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{table ? <path d="M4 19h16M7 15l4-4 3 3 5-6" /> : <path d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14" />}</svg>
      {table ? 'Show chart' : 'Show as table'}
    </button>
  )
}

export function Legend({ items, label }: { items: ReadonlyArray<{ key: string; label: string; color: string }>; label: string }) {
  return (
    <ul className="chart-legend" aria-label={label}>
      {items.map((item) => <li key={item.key}><i style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</li>)}
    </ul>
  )
}
