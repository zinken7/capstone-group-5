import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getAnalyticsBreakdowns, getAnalyticsSummary, getAnalyticsTimeline } from '../../../lib/api/analytics'
import type { AnalyticsBreakdownItemDto, AnalyticsBreakdownsDto, AnalyticsFilters, AnalyticsSummaryDto, AnalyticsTimelineDto } from '../../../lib/api/analytics'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../../contribute/types'
import { formatCountry, formatEnumLabel, formatNumber } from '../../../lib/format'
import StateMessage from '../../../shared/components/StateMessage'
import type { AnalyticsSummary } from '../types'
import '../analytics.css'

interface AnalyticsPageProps {
  /** Test/demo override; normal application runtime always uses the live API. */
  summary?: AnalyticsSummary
}

interface AnalyticsData {
  summary: AnalyticsSummaryDto
  breakdowns: AnalyticsBreakdownsDto
  timeline: AnalyticsTimelineDto
  statusMix: AnalyticsBreakdownItemDto[]
}

interface ChartRow {
  key: string | null
  label: string
  value: number
  share: number
}

const STATUS_FILTERS = ['operational', 'commissioning', 'announced', 'decommissioned']
const CHART_COLORS = ['#27348b', '#2563eb', '#0f766e', '#a4571b', '#6b21a8', '#64748b', '#c2410c']

function formatTooltipValue(value: unknown): string {
  return formatNumber(Number(value ?? 0))
}

function toRows(items: AnalyticsBreakdownItemDto[], label: (key: string | null) => string): ChartRow[] {
  return items.map((item) => ({ key: item.key, label: label(item.key), value: item.machine_count, share: item.share }))
}

function dataFromSummary(summary: AnalyticsSummary): AnalyticsData {
  const toDto = (items: { label: string; value: number }[]) => items.map((item) => ({ key: item.label, machine_count: item.value, share: summary.machineCount ? item.value / summary.machineCount : 0 }))
  return {
    summary: { machine_count: summary.machineCount, site_count: summary.siteCount, country_count: summary.countryCount },
    breakdowns: {
      machine_count: summary.machineCount,
      by_country: toDto(summary.machinesByCountry),
      by_machine_type: toDto(summary.machinesByType),
      by_manufacturer: [],
      by_supplier: toDto(summary.machinesBySupplier),
      by_automation_level: toDto(summary.machinesByAutomationLevel),
    },
    timeline: { excluded_count: 0, excluded_machine_count: 0, years: [] },
    statusMix: [],
  }
}

function FilterBar({ filters, onChange, onClear }: { filters: AnalyticsFilters; onChange: (next: AnalyticsFilters) => void; onClear: () => void }) {
  const [reference, setReference] = useState(DEFAULT_CONTRIBUTION_REFERENCE_DATA)
  const [remoteOptions, setRemoteOptions] = useState({ countries: [] as string[], suppliers: [] as string[], manufacturers: [] as string[] })

  useEffect(() => {
    let active = true
    getContributionReferenceData().then((data) => active && setReference(data)).catch(() => undefined)
    getAnalyticsBreakdowns().then((data) => {
      if (!active) return
      setRemoteOptions({
        countries: data.by_country.map((item) => item.key).filter((key): key is string => key !== null),
        suppliers: data.by_supplier.map((item) => item.key).filter((key): key is string => key !== null),
        manufacturers: data.by_manufacturer.map((item) => item.key).filter((key): key is string => key !== null),
      })
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  const set = (field: keyof AnalyticsFilters, value: string) => {
    const next = { ...filters }
    if (value) next[field] = value
    else delete next[field]
    onChange(next)
  }

  const select = (label: string, field: keyof AnalyticsFilters, options: readonly (readonly [string, string])[]) => (
    <label className="analytics-filter" key={field}>
      <span>{label}</span>
      <select value={filters[field] ?? ''} onChange={(event) => set(field, event.target.value)}>
        <option value="">All</option>
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  )

  return (
    <section className="analytics-filters" aria-label="Analytics filters">
      {select('Country', 'country', remoteOptions.countries.map((value) => [value, formatCountry(value)] as const))}
      {select('Machine type', 'machineType', reference.machineTypes)}
      {select('Technology supplier', 'supplier', remoteOptions.suppliers.map((value) => [value, value] as const))}
      {select('Manufacturer', 'manufacturer', remoteOptions.manufacturers.map((value) => [value, value] as const))}
      {select('Automation level', 'automationLevel', reference.automationLevels)}
      {select('Environment', 'environment', reference.environments)}
      <button className="button button--secondary analytics-clear" type="button" onClick={onClear} disabled={Object.keys(filters).length === 0}>Clear all</button>
    </section>
  )
}

function ChartCard({ title, description, rows, loading, error, children, onFilter }: {
  title: string
  description: string
  rows: ChartRow[]
  loading: boolean
  error: string | null
  children: ReactNode
  onFilter?: (key: string) => void
}) {
  const [table, setTable] = useState(false)
  return (
    <section className="chart-card" aria-labelledby={`${title}-heading`}>
      <header className="chart-card__header">
        <div><h2 id={`${title}-heading`}>{title}</h2><p>{description}</p></div>
        <button className="button button--secondary chart-toggle" type="button" onClick={() => setTable((current) => !current)}>{table ? 'Show chart' : 'Show as table'}</button>
      </header>
      {loading && <div className="chart-skeleton" role="status">Loading chart…</div>}
      {!loading && error && <StateMessage variant="error" title="Chart unavailable" message={error} />}
      {!loading && !error && rows.length === 0 && <StateMessage title="No matching data" message="No machines match these filters." />}
      {!loading && !error && rows.length > 0 && (table ? (
        <div className="chart-table-wrap"><table className="chart-table"><caption className="visually-hidden">{title}</caption><thead><tr><th>Group</th><th className="numeric">Machines</th><th className="numeric">Share</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key ?? 'unknown'}><th scope="row">{onFilter && row.key ? <button type="button" className="table-link" onClick={() => onFilter(row.key as string)}>{row.label}</button> : row.label}</th><td className="numeric">{formatNumber(row.value)}</td><td className="numeric">{Math.round(row.share * 100)}%</td></tr>)}</tbody></table></div>
      ) : children)}
    </section>
  )
}

function HorizontalBars({ rows, color = '#27348b' }: { rows: ChartRow[]; color?: string }) {
  const height = Math.max(180, rows.length * 38)
  const data = rows.map((row) => ({ label: row.label, value: row.value }))
  return <div className="chart-visual" aria-label="Bar chart"><ResponsiveContainer width="100%" height={height}><BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d8dee9" /><XAxis type="number" tickFormatter={(value: number) => formatNumber(value)} /><YAxis dataKey="label" type="category" width={132} tick={{ fontSize: 12 }} /><Tooltip formatter={(value: unknown) => [formatTooltipValue(value), 'Machines']} /><Bar dataKey="value" fill={color} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div>
}

function AnalyticsPage({ summary: suppliedSummary }: AnalyticsPageProps = {}) {
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [data, setData] = useState<AnalyticsData | null>(suppliedSummary ? dataFromSummary(suppliedSummary) : null)
  const [loading, setLoading] = useState(suppliedSummary === undefined)
  const [error, setError] = useState<string | null>(null)
  const [timelineMode, setTimelineMode] = useState<'in_service' | 'newly_commissioned'>('in_service')

  useEffect(() => {
    if (suppliedSummary !== undefined) return
    let active = true
    Promise.all([
      getAnalyticsSummary(filters),
      getAnalyticsBreakdowns(filters),
      getAnalyticsTimeline(filters),
      Promise.all(STATUS_FILTERS.map((status) => getAnalyticsSummary({ ...filters, status }))),
    ]).then(([summary, breakdowns, timeline, statuses]) => {
      if (active) {
        setData({ summary, breakdowns, timeline, statusMix: statuses.map((item, index) => ({ key: STATUS_FILTERS[index] ?? null, machine_count: item.machine_count, share: summary.machine_count ? item.machine_count / summary.machine_count : 0 })) })
        setError(null)
        setLoading(false)
      }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : 'Unable to load analytics'); setLoading(false) }
    })
    return () => { active = false }
  }, [filters, suppliedSummary])

  const summary = data?.summary
  const breakdowns = data?.breakdowns
  const timeline = data?.timeline
  const totalRows = useMemo(() => breakdowns ? toRows(breakdowns.by_machine_type, formatEnumLabel) : [], [breakdowns])
  const topTypes = totalRows.slice(0, 10)
  const otherTypes = totalRows.slice(10)
  const [showOtherTypes, setShowOtherTypes] = useState(false)
  const countryRows = breakdowns ? toRows(breakdowns.by_country, formatCountry) : []
  const supplierRows = breakdowns ? toRows(breakdowns.by_supplier, (key) => key ?? 'Not recorded') : []
  const manufacturerRows = breakdowns ? toRows(breakdowns.by_manufacturer, (key) => key ?? 'Not recorded') : []
  const automationRows = breakdowns ? toRows(breakdowns.by_automation_level, formatEnumLabel) : []
  const timelineRows = timeline?.years ?? []
  const timelineData = timelineRows.map((row) => ({ year: row.year, value: timelineMode === 'in_service' ? row.in_service : row.newly_commissioned }))

  const chartError = error
  const selectFilter = (field: keyof AnalyticsFilters) => (key: string) => setFilters((current) => ({ ...current, [field]: key }))

  const emptyMessage = Object.keys(filters).length > 0
    ? 'No machines match these filters.'
    : 'Analytics will appear when equipment records are available.'

  return (
    <section className="product-page analytics-page">
      <header className="page-heading"><div><p className="eyebrow">Market overview</p><h1>Analytics</h1><p className="intro">Explore verified equipment measures with the same filters used by the register and map.</p></div></header>
      <FilterBar filters={filters} onChange={setFilters} onClear={() => setFilters({})} />
      {loading && !data && <StateMessage variant="loading" title="Loading live analytics" message="Connecting to the database-backed analytics API…" />}
      {!loading && chartError && !data && <StateMessage variant="error" title="Unable to load analytics" message={`${chartError}. Check that the backend is running and try again.`} />}
      {summary && breakdowns && (
        <>
          {summary.machine_count === 0 ? <StateMessage title="No analytics available" message={emptyMessage} /> : (
            <>
              <div className="metric-grid analytics-metrics">
                <article className="metric-card"><span>Automated machines</span><strong>{formatNumber(summary.machine_count)}</strong><small>Verified quantity</small></article>
                <article className="metric-card"><span>Mine sites</span><strong>{formatNumber(summary.site_count)}</strong><small>Distinct locations</small></article>
                <article className="metric-card"><span>Countries</span><strong>{formatNumber(summary.country_count)}</strong><small>Geographic coverage</small></article>
                <article className="metric-card metric-card--status"><span>Status mix</span><div className="status-stack" aria-label="Machines by deployment status">{data?.statusMix.map((item, index) => <span key={item.key ?? index} className={`status-stack__segment status-stack__segment--${item.key}`} style={{ width: `${item.share * 100}%` }} title={`${formatEnumLabel(item.key)}: ${formatNumber(item.machine_count)}`} />)}</div><small>{data?.statusMix.map((item) => `${formatEnumLabel(item.key)} ${formatNumber(item.machine_count)}`).join(' · ')}</small></article>
              </div>
              <p className="analytics-footnote">Verified records only. Counts follow the filters above; machines are counted by deployment quantity.</p>
              <div className="chart-grid analytics-chart-grid">
                <section className="chart-card chart-card--wide" aria-labelledby="timeline-heading"><header className="chart-card__header"><div><h2 id="timeline-heading">Machines in service over time</h2><p>{timeline?.excluded_count ? `${formatNumber(timeline.excluded_machine_count)} machines in ${formatNumber(timeline.excluded_count)} records have no commissioning year and are excluded.` : 'Year-end in-service quantity from the analytics API.'}</p></div><button className="button button--secondary chart-toggle" type="button" onClick={() => setTimelineMode((mode) => mode === 'in_service' ? 'newly_commissioned' : 'in_service')}>{timelineMode === 'in_service' ? 'Show new per year' : 'Show in service'}</button></header>{timelineData.length === 0 ? <StateMessage title="No timeline data" message="No dated records match these filters." /> : <div className="chart-visual"><ResponsiveContainer width="100%" height={280}><AreaChart data={timelineData} margin={{ top: 12, right: 18, left: 4, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#d8dee9" /><XAxis dataKey="year" /><YAxis tickFormatter={(value: number) => formatNumber(value)} /><Tooltip formatter={(value: unknown) => [formatTooltipValue(value), timelineMode === 'in_service' ? 'In service' : 'Newly commissioned']} /><Area type="monotone" dataKey="value" stroke="#27348b" fill="#dbe3ff" strokeWidth={3} /></AreaChart></ResponsiveContainer></div>}</section>
                <ChartCard title="Machines by country" description="Select a country in the table to filter all cards." rows={countryRows} loading={loading && !data} error={chartError} onFilter={selectFilter('country')}><HorizontalBars rows={countryRows} /></ChartCard>
                <ChartCard title="Machines by automation level" description="Unknown levels remain unclassified." rows={automationRows} loading={loading && !data} error={chartError}><HorizontalBars rows={automationRows} color="#1d4ed8" /></ChartCard>
                <ChartCard title="Machines by technology supplier" description="Supplier share of filtered machine quantity." rows={supplierRows} loading={loading && !data} error={chartError}><div className="donut-chart"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={supplierRows} dataKey="value" nameKey="label" innerRadius={62} outerRadius={94} paddingAngle={2}>{supplierRows.map((row, index) => <Cell key={row.key ?? 'unknown'} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value: unknown) => [formatTooltipValue(value), 'Machines']} /></PieChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="Machines by type" description="Top ten machine types; expand the remaining groups when needed." rows={showOtherTypes ? totalRows : topTypes} loading={loading && !data} error={chartError} onFilter={selectFilter('machineType')}><HorizontalBars rows={showOtherTypes ? totalRows : topTypes} color="#0f766e" />{otherTypes.length > 0 && <button className="table-link chart-more" type="button" onClick={() => setShowOtherTypes((current) => !current)}>{showOtherTypes ? 'Show top 10 only' : `Show the other ${otherTypes.length} types`}</button>}</ChartCard>
                <ChartCard title="Machine manufacturer share" description="Manufacturer counts within the filtered result." rows={manufacturerRows} loading={loading && !data} error={chartError}><HorizontalBars rows={manufacturerRows} color="#a4571b" /></ChartCard>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

export default AnalyticsPage
