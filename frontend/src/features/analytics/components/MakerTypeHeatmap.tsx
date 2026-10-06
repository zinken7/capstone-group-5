import { useMemo } from 'react'

import type { AnalyticsCrosstabDto } from '../../../lib/api/analytics'
import { formatEnumLabel, formatNumber } from '../../../lib/format'
import { HEAT_RAMP, crosstabTotals } from '../chartData'
import { ChartCard, EmptyChart } from './ChartCard'

const OTHER = '__other__'

function heatBin(value: number, max: number): number {
  const ratio = max ? value / max : 0
  return Math.min(HEAT_RAMP.length - 1, Math.floor(ratio * HEAT_RAMP.length - 1e-9))
}

/** Machines for each manufacturer and machine type, to show whose fleets are being automated and for which jobs. */
function MakerTypeHeatmap({ crosstab, onFilter, maxRows = 10, maxColumns = 8 }: {
  crosstab: AnalyticsCrosstabDto
  onFilter: (manufacturer: string, machineType: string) => void
  maxRows?: number
  maxColumns?: number
}) {
  const grid = useMemo(() => {
    const rowTotals = crosstabTotals(crosstab, 'row')
    const columnTotals = crosstabTotals(crosstab, 'column')
    const rows = rowTotals.slice(0, maxRows).map((row) => row.key)
    const columns = columnTotals.slice(0, maxColumns).map((column) => column.key)
    if (rowTotals.length > maxRows) rows.push(OTHER)
    if (columnTotals.length > maxColumns) columns.push(OTHER)
    const rowSet = new Set(rows)
    const columnSet = new Set(columns)
    const values = new Map<string, number>()
    const totals = { rows: new Map<string | null, number>(), columns: new Map<string | null, number>() }
    for (const cell of crosstab.cells) {
      const row = rowSet.has(cell.row) ? cell.row : OTHER
      const column = columnSet.has(cell.column) ? cell.column : OTHER
      const key = `${row}\u0000${column}`
      values.set(key, (values.get(key) ?? 0) + cell.machine_count)
      totals.rows.set(row, (totals.rows.get(row) ?? 0) + cell.machine_count)
      totals.columns.set(column, (totals.columns.get(column) ?? 0) + cell.machine_count)
    }
    // "Other" groups add up many types or makers, so they are left out of the colour scale
    const max = Math.max(0, ...Array.from(values).filter(([key]) => !key.split('\u0000').includes(OTHER)).map(([, value]) => value))
    return { rows, columns, values, totals, max }
  }, [crosstab, maxRows, maxColumns])

  const rowLabel = (key: string | null) => key === OTHER ? 'Other manufacturers' : key ?? 'Not recorded'
  const columnLabel = (key: string | null) => key === OTHER ? 'Other types' : key === null ? 'Not recorded' : formatEnumLabel(key)

  return (
    <ChartCard
      id="maker-type"
      className="chart-card--wide"
      title="Machines by manufacturer and type"
      description="Whose fleets are being automated, and for which jobs. Select a cell to filter by both."
      actions={(
        <div className="heat-legend" aria-hidden="true">
          <span>Fewer</span>
          {HEAT_RAMP.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
          <span>More machines</span>
        </div>
      )}
    >
      {grid.rows.length === 0 ? <EmptyChart /> : (
        <div className="heatmap-wrap" tabIndex={0} role="region" aria-label="Machines by manufacturer and type table">
          <table className="heatmap">
            <caption className="visually-hidden">Machines by manufacturer (rows) and machine type (columns)</caption>
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Manufacturer</span></th>
                {grid.columns.map((column) => <th scope="col" key={column ?? 'none'}>{columnLabel(column)}</th>)}
                <th scope="col" className="heatmap__total">Total</th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row) => (
                <tr key={row ?? 'none'}>
                  <th scope="row">{rowLabel(row)}</th>
                  {grid.columns.map((column) => {
                    const value = grid.values.get(`${row}\u0000${column}`) ?? 0
                    if (value === 0) return <td key={column ?? 'none'} className="heatmap__empty"><span aria-hidden="true">–</span><span className="visually-hidden">0</span></td>
                    if (row === OTHER || column === OTHER) return <td key={column ?? 'none'} className="heatmap__other">{formatNumber(value)}</td>
                    const bin = heatBin(value, grid.max)
                    const style = { backgroundColor: HEAT_RAMP[bin], color: bin >= 2 ? '#ffffff' : '#14213d' }
                    const label = `${rowLabel(row)}, ${columnLabel(column)}: ${formatNumber(value)} machines`
                    return (
                      <td key={column ?? 'none'}>
                        {row !== null && column !== null
                          ? <button className="heatmap__cell" type="button" style={style} aria-label={`Filter by ${label}`} onClick={() => onFilter(row, column)}>{formatNumber(value)}</button>
                          : <span className="heatmap__cell" style={style}>{formatNumber(value)}</span>}
                      </td>
                    )
                  })}
                  <td className="heatmap__total">{formatNumber(grid.totals.rows.get(row) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                {grid.columns.map((column) => <td key={column ?? 'none'} className="heatmap__total">{formatNumber(grid.totals.columns.get(column) ?? 0)}</td>)}
                <td className="heatmap__total">{formatNumber(crosstab.machine_count)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ChartCard>
  )
}

export default MakerTypeHeatmap
