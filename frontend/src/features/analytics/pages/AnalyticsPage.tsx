import { useEffect, useMemo, useState } from 'react'

import { getAnalyticsBreakdowns, getAnalyticsCrosstab, getAnalyticsSummary, getAnalyticsTimeline } from '../../../lib/api/analytics'
import type { AnalyticsBreakdownsDto, AnalyticsCrosstabDto, AnalyticsFilters, AnalyticsSummaryDto, AnalyticsTimelineDto } from '../../../lib/api/analytics'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../../contribute/types'
import { formatCountry, formatEnumLabel } from '../../../lib/format'
import StateMessage from '../../../shared/components/StateMessage'
import { byValue, emptyCrosstab, plural, toRows } from '../chartData'
import AutomationDonut from '../components/AutomationDonut'
import BarList from '../components/BarList'
import { ChartCard } from '../components/ChartCard'
import CountryTreemap from '../components/CountryTreemap'
import EnvironmentSplit from '../components/EnvironmentSplit'
import MakerTypeHeatmap from '../components/MakerTypeHeatmap'
import SupplierLevels from '../components/SupplierLevels'
import TimelineCard from '../components/TimelineCard'
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
  supplierByLevel: AnalyticsCrosstabDto
  makerByType: AnalyticsCrosstabDto
  typeByEnvironment: AnalyticsCrosstabDto
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
      by_status: [],
      by_commodity: [],
    },
    timeline: { excluded_count: 0, excluded_machine_count: 0, years: [] },
    supplierByLevel: emptyCrosstab('supplier', 'automation_level'),
    makerByType: emptyCrosstab('manufacturer', 'machine_type'),
    typeByEnvironment: emptyCrosstab('machine_type', 'environment'),
  }
}

/** The commissioning year range in words, or null when no range is set. */
function periodLabel(filters: AnalyticsFilters): string | null {
  const { commissionedFrom: from, commissionedTo: to } = filters
  if (from && to) return from === to ? `in ${from}` : `${from}–${to}`
  if (from) return `since ${from}`
  if (to) return `up to ${to}`
  return null
}

function FilterBar({ filters, onChange, onClear }: { filters: AnalyticsFilters; onChange: (next: AnalyticsFilters) => void; onClear: () => void }) {
  const [reference, setReference] = useState(DEFAULT_CONTRIBUTION_REFERENCE_DATA)
  const [remoteOptions, setRemoteOptions] = useState({ countries: [] as string[], commodities: [] as string[], suppliers: [] as string[], manufacturers: [] as string[] })
  const [years, setYears] = useState<number[]>([])

  useEffect(() => {
    let active = true
    const keys = (items: { key: string | null }[] = []) => items.map((item) => item.key).filter((key): key is string => key !== null)
    getContributionReferenceData().then((data) => active && setReference(data)).catch(() => undefined)
    getAnalyticsBreakdowns().then((data) => {
      if (!active) return
      setRemoteOptions({
        countries: keys(data.by_country),
        commodities: keys(data.by_commodity),
        suppliers: keys(data.by_supplier),
        manufacturers: keys(data.by_manufacturer),
      })
    }).catch(() => undefined)
    getAnalyticsTimeline().then((data) => active && setYears(data.years.map((row) => row.year).reverse())).catch(() => undefined)
    return () => { active = false }
  }, [])

  const set = (field: keyof AnalyticsFilters, value: string) => {
    const next = { ...filters }
    if (value) next[field] = value
    else delete next[field]
    onChange(next)
  }

  const select = (label: string, field: keyof AnalyticsFilters, allLabel: string, options: readonly (readonly [string, string])[]) => (
    <label className="analytics-filter" key={field}>
      <span>{label}</span>
      <select value={filters[field] ?? ''} onChange={(event) => set(field, event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  )

  return (
    <section className="analytics-filters" aria-label="Analytics filters">
      {select('Country', 'country', 'All countries', remoteOptions.countries.map((value) => [value, formatCountry(value)] as const))}
      {select('Commodity', 'commodity', 'All commodities', remoteOptions.commodities.map((value) => [value, formatEnumLabel(value)] as const))}
      {select('Machine type', 'machineType', 'All machine types', reference.machineTypes)}
      {select('Technology supplier', 'supplier', 'All suppliers', remoteOptions.suppliers.map((value) => [value, value] as const))}
      {select('Manufacturer', 'manufacturer', 'All manufacturers', remoteOptions.manufacturers.map((value) => [value, value] as const))}
      {select('Automation level', 'automationLevel', 'All automation levels', reference.automationLevels)}
      {select('Environment', 'environment', 'All environments', reference.environments)}
      {select('Commissioned from', 'commissionedFrom', 'Any year', years.filter((year) => !filters.commissionedTo || year <= Number(filters.commissionedTo)).map((year) => [String(year), String(year)] as const))}
      {select('Commissioned to', 'commissionedTo', 'Any year', years.filter((year) => !filters.commissionedFrom || year >= Number(filters.commissionedFrom)).map((year) => [String(year), String(year)] as const))}
      <button className="analytics-clear" type="button" onClick={onClear} disabled={Object.keys(filters).length === 0}>Clear all</button>
    </section>
  )
}

function AnalyticsPage({ summary: suppliedSummary }: AnalyticsPageProps = {}) {
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [data, setData] = useState<AnalyticsData | null>(suppliedSummary ? dataFromSummary(suppliedSummary) : null)
  const [loading, setLoading] = useState(suppliedSummary === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (suppliedSummary !== undefined) return
    let active = true
    Promise.all([
      getAnalyticsSummary(filters),
      getAnalyticsBreakdowns(filters),
      getAnalyticsTimeline(filters),
      getAnalyticsCrosstab('supplier', 'automation_level', filters),
      getAnalyticsCrosstab('manufacturer', 'machine_type', filters),
      getAnalyticsCrosstab('machine_type', 'environment', filters),
    ]).then(([summary, breakdowns, timeline, supplierByLevel, makerByType, typeByEnvironment]) => {
      if (active) {
        setData({ summary, breakdowns, timeline, supplierByLevel, makerByType, typeByEnvironment })
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
  const rows = useMemo(() => breakdowns ? {
    country: byValue(toRows(breakdowns.by_country, formatCountry)),
    commodity: byValue(toRows(breakdowns.by_commodity ?? [], (key) => key === null ? 'Not recorded' : formatEnumLabel(key))),
  } : null, [breakdowns])

  const updateFilters = (next: AnalyticsFilters) => {
    setLoading(true)
    setError(null)
    setFilters(next)
  }
  const selectFilter = (field: keyof AnalyticsFilters) => (key: string) => updateFilters({ ...filters, [field]: key })

  const emptyMessage = Object.keys(filters).length > 0
    ? 'No machines match these filters.'
    : 'Analytics will appear when equipment records are available.'

  return (
    <section className="product-page analytics-page">
      <header className="page-heading"><div><p className="eyebrow">Market overview</p><h1>Analytics</h1><p className="intro">How the autonomous mining equipment market is growing, where, and who supplies it. Every chart follows the filters below.</p></div></header>
      <FilterBar filters={filters} onChange={updateFilters} onClear={() => updateFilters({})} />
      {loading && !data && <StateMessage variant="loading" title="Loading live analytics" message="Connecting to the database-backed analytics API…" />}
      {error && !data && <StateMessage variant="error" title="Unable to load analytics" message={`${error}. Check that the backend is running and try again.`} />}
      {error && data && <StateMessage variant="error" title="Unable to update analytics" message={`${error}. The charts still show the previous filters.`} />}
      {summary && rows && data && (
        summary.machine_count === 0 ? <StateMessage title="No analytics available" message={emptyMessage} /> : (
          <>
            <p className="analytics-scope">
              <span className="visually-hidden" role="status">{loading ? 'Updating analytics for the selected filters' : ''}</span>
              Showing <strong>{plural(summary.machine_count, 'machine')}</strong>{periodLabel(filters) && <> commissioned <strong>{periodLabel(filters)}</strong></>} at <strong>{plural(summary.site_count, 'mine site')}</strong> in <strong>{plural(summary.country_count, 'country', 'countries')}</strong>. Select a bar or cell to filter every chart.
            </p>
            <div className="analytics-grid" aria-busy={loading}>
              <TimelineCard timeline={data.timeline} />
              <AutomationDonut items={data.breakdowns.by_automation_level} onFilter={selectFilter('automationLevel')} />
              <ChartCard id="country" title="Machines by country" description="Each tile is a country, sized by its machines.">
                <CountryTreemap rows={rows.country} onFilter={selectFilter('country')} />
              </ChartCard>
              <ChartCard id="supplier" title="Machines by technology supplier" description="Who supplies the most machines, and at which automation level.">
                <SupplierLevels crosstab={data.supplierByLevel} onFilter={selectFilter('supplier')} />
              </ChartCard>
              <MakerTypeHeatmap crosstab={data.makerByType} onFilter={(manufacturer, machineType) => updateFilters({ ...filters, manufacturer, machineType })} />
              <EnvironmentSplit crosstab={data.typeByEnvironment} onFilter={selectFilter('machineType')} />
              <ChartCard id="commodity" title="Machines by commodity" description="What the mines produce.">
                <BarList name="Machines by commodity" rows={rows.commodity} limit={10} noun={['commodity', 'commodities']} onFilter={selectFilter('commodity')} />
              </ChartCard>
            </div>
            <p className="analytics-footnote">Verified records only. Counts use the deployment quantity, so one record can cover several machines, and include every deployment status except in the timeline, which leaves out announced deployments.</p>
          </>
        )
      )}
    </section>
  )
}

export default AnalyticsPage
