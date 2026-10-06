import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { AnalyticsBreakdownItemDto } from '../../../lib/api/analytics'
import { formatNumber } from '../../../lib/format'
import { AUTOMATION_LEVELS, AUTOMATION_RAMP, UNCLASSIFIED_COLOR, automationLabel, formatShare } from '../chartData'
import type { ChartRow } from '../chartData'
import { ChartCard, EmptyChart } from './ChartCard'

function colorFor(row: ChartRow): string {
  return row.key ? AUTOMATION_RAMP[row.key] ?? UNCLASSIFIED_COLOR : UNCLASSIFIED_COLOR
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: ChartRow }> }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="chart-tooltip">
      <strong>{formatShare(row.share)}</strong>
      <span>{row.label}, {formatNumber(row.value)} machines</span>
    </div>
  )
}

/** Share of machines at each automation level, ordered from operator assistance to fully autonomous. */
function AutomationDonut({ items, onFilter }: { items: AnalyticsBreakdownItemDto[]; onFilter: (key: string) => void }) {
  const rank = (key: string | null) => key === null ? AUTOMATION_LEVELS.length : AUTOMATION_LEVELS.indexOf(key as typeof AUTOMATION_LEVELS[number])
  const rows: ChartRow[] = items
    .filter((item) => item.key !== null || item.machine_count > 0)
    .map((item) => ({ key: item.key, label: automationLabel(item.key), value: item.machine_count, share: item.share }))
    .sort((a, b) => rank(a.key) - rank(b.key))
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const advanced = rows.filter((row) => row.key === 'semi_autonomous' || row.key === 'autonomous').reduce((sum, row) => sum + row.value, 0)
  const summary = total ? `${formatShare(advanced / total)} are semi-autonomous or fully autonomous.` : undefined

  return (
    <ChartCard id="automation" className="chart-card--automation" title="Machines by automation level" description={summary}>
      {total === 0 ? <EmptyChart /> : (
        <div className="donut">
          <div className="donut__chart" role="img" aria-label={`Machines by automation level: ${rows.map((row) => `${row.label} ${formatNumber(row.value)} machines, ${formatShare(row.share)}`).join('; ')}`}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={rows.filter((row) => row.value > 0)} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="#ffffff" strokeWidth={2} animationDuration={500}>
                  {rows.filter((row) => row.value > 0).map((row) => <Cell key={row.key ?? 'unclassified'} fill={colorFor(row)} />)}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut__centre" aria-hidden="true"><strong>{formatNumber(total)}</strong><span>machines</span></div>
          </div>
          <ul className="donut__legend" aria-label="Automation levels">
            {rows.map((row) => {
              const share = formatShare(row.share)
              const content = (
                <>
                  <i style={{ backgroundColor: colorFor(row) }} aria-hidden="true" />
                  <span className="donut__label">{row.label}</span>
                  <span className="donut__count">{formatNumber(row.value)}</span>
                  <strong>{share}</strong>
                </>
              )
              return (
                <li key={row.key ?? 'unclassified'}>
                  {row.key && row.value > 0
                    ? <button className="donut__row donut__row--action" type="button" aria-label={`Filter by ${row.label}: ${formatNumber(row.value)} machines, ${share}`} onClick={() => onFilter(row.key as string)}>{content}</button>
                    : <div className="donut__row">{content}</div>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}

export default AutomationDonut
