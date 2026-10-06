import type { ReactNode } from 'react'

export function ChartCard({ id, title, description, actions, note, className = '', children }: {
  id: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  note?: ReactNode
  className?: string
  children: ReactNode
}) {
  const headingId = `analytics-${id}-heading`
  return (
    <section className={`chart-card ${className}`.trim()} aria-labelledby={headingId}>
      <header className="chart-card__header">
        <div>
          <h2 id={headingId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="chart-card__actions">{actions}</div>}
      </header>
      {children}
      {note && <p className="chart-card__note">{note}</p>}
    </section>
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
