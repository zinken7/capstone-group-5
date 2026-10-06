import { formatNumber } from '../../../lib/format'
import { formatShare } from '../chartData'
import type { ChartRow } from '../chartData'
import { squarify } from '../treemap'
import { EmptyChart } from './ChartCard'

const OTHER_KEY = '__other__'

/** Countries as tiles sized by machines, so the countries that dominate the market stand out. */
function CountryTreemap({ rows, limit = 11, onFilter }: { rows: ChartRow[]; limit?: number; onFilter: (key: string) => void }) {
  if (rows.length === 0) return <EmptyChart />
  const shown = rows.slice(0, limit)
  const rest = rows.slice(limit)
  const items: ChartRow[] = rest.length > 0
    ? [...shown, { key: OTHER_KEY, label: `${rest.length} other ${rest.length === 1 ? 'country' : 'countries'}`, value: rest.reduce((sum, row) => sum + row.value, 0), share: rest.reduce((sum, row) => sum + row.share, 0) }]
    : shown
  const tiles = squarify(items, (row) => row.value)

  return (
    <ul className="treemap" aria-label="Machines by country">
      {tiles.map(({ item, left, top, width, height }) => {
        const share = formatShare(item.share)
        const style = { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }
        const text = (
          <span className="treemap__text">
            <span className="treemap__label">{item.label}</span>
            <span className="treemap__value">{formatNumber(item.value)} · {share}</span>
          </span>
        )
        const filterable = item.key !== null && item.key !== OTHER_KEY
        return (
          <li key={item.key ?? `not-recorded-${item.label}`} className="treemap__tile" style={style}>
            {filterable
              ? <button className="treemap__box" type="button" title={`${item.label}: ${formatNumber(item.value)} machines (${share})`} aria-label={`Filter by ${item.label}: ${formatNumber(item.value)} machines, ${share}`} onClick={() => onFilter(item.key as string)}>{text}</button>
              : <div className={`treemap__box${item.key === OTHER_KEY ? ' treemap__box--other' : ''}`} title={`${item.label}: ${formatNumber(item.value)} machines (${share})`} aria-label={`${item.label}: ${formatNumber(item.value)} machines, ${share}`}>{text}</div>}
          </li>
        )
      })}
    </ul>
  )
}

export default CountryTreemap
