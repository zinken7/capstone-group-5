import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { AnalyticsTimelineDto } from '../../../lib/api/analytics'
import { formatNumber } from '../../../lib/format'
import { AXIS_TEXT, BRAND, GRID, plural } from '../chartData'
import { ChartCard, EmptyChart, TableToggle } from './ChartCard'

type TimelineMode = 'in_service' | 'newly_commissioned'

function TimelineTooltip({ active, payload, label, measure }: { active?: boolean; payload?: ReadonlyArray<{ value?: unknown }>; label?: unknown; measure: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{formatNumber(Number(payload[0]?.value ?? 0))}</strong>
      <span>{measure}, {String(label)}</span>
    </div>
  )
}

function TimelineCard({ timeline }: { timeline: AnalyticsTimelineDto }) {
  const [mode, setMode] = useState<TimelineMode>('in_service')
  const [table, setTable] = useState(false)
  const years = timeline.years
  const latest = years.at(-1)
  const previous = years.at(-2)
  const measure = mode === 'in_service' ? 'In service' : 'Newly commissioned'
  const valueOf = (row: { in_service: number; newly_commissioned: number }) => mode === 'in_service' ? row.in_service : row.newly_commissioned
  const data = years.map((row) => ({ year: row.year, value: valueOf(row) }))
  const delta = latest && previous ? valueOf(latest) - valueOf(previous) : null
  const note = timeline.excluded_count
    ? `${plural(timeline.excluded_machine_count, 'machine')} in ${plural(timeline.excluded_count, 'record')} have no commissioning year and are left out.`
    : undefined

  const modeButton = (value: TimelineMode, text: string) => (
    <button type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{text}</button>
  )
  return (
    <ChartCard
      id="timeline"
      className="chart-card--timeline"
      title={mode === 'in_service' ? 'Machines in service over time' : 'Machines commissioned per year'}
      actions={<>
        <div className="segmented" role="group" aria-label="Timeline measure">
          {modeButton('in_service', 'In service')}
          {modeButton('newly_commissioned', 'New per year')}
        </div>
        <TableToggle table={table} onToggle={() => setTable((current) => !current)} />
      </>}
      note={note}
    >
      {latest ? (
        <>
          <div className="timeline-hero">
            <span className="timeline-hero__value">{formatNumber(valueOf(latest))}</span>
            <span className="timeline-hero__label">{mode === 'in_service' ? `machines in service at the end of ${latest.year}` : `machines commissioned in ${latest.year}`}</span>
            {delta !== null && previous && (
              <span className="timeline-hero__delta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{delta >= 0 ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}</svg>
                {delta === 0 ? `No change from ${previous.year}` : `${formatNumber(Math.abs(delta))} ${delta > 0 ? 'more' : 'fewer'} than ${previous.year}`}
              </span>
            )}
          </div>
          {table ? (
            <div className="chart-table-wrap">
              <table className="chart-table">
                <caption className="visually-hidden">Machines in service and newly commissioned by year</caption>
                <thead><tr><th scope="col">Year</th><th scope="col" className="numeric">In service</th><th scope="col" className="numeric">Newly commissioned</th></tr></thead>
                <tbody>{years.map((row) => <tr key={row.year}><th scope="row">{row.year}</th><td className="numeric">{formatNumber(row.in_service)}</td><td className="numeric">{formatNumber(row.newly_commissioned)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="chart-visual" role="img" aria-label={`${measure} by year, from ${formatNumber(data[0]?.value ?? 0)} in ${years[0]?.year} to ${formatNumber(valueOf(latest))} in ${latest.year}`}>
              <ResponsiveContainer width="100%" height={260}>
                {mode === 'in_service' ? (
                  <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} minTickGap={16} />
                    <YAxis width={48} tickCount={5} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickFormatter={(value: number) => formatNumber(value)} />
                    <Tooltip cursor={{ stroke: '#9aa3b2', strokeWidth: 1 }} content={<TimelineTooltip measure={measure} />} />
                    <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2} fill={BRAND} fillOpacity={0.1} animationDuration={500} activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2, fill: BRAND }} />
                  </AreaChart>
                ) : (
                  <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} minTickGap={16} />
                    <YAxis width={48} tickCount={5} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickFormatter={(value: number) => formatNumber(value)} />
                    <Tooltip cursor={{ fill: 'rgb(39 52 139 / 6%)' }} content={<TimelineTooltip measure={measure} />} />
                    <Bar dataKey="value" fill={BRAND} maxBarSize={24} radius={[4, 4, 0, 0]} animationDuration={500} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : <EmptyChart message="No commissioning years are recorded for these filters." />}
    </ChartCard>
  )
}

export default TimelineCard
