import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { formatCommissioning, formatCountry, formatEnumLabel, formatNumber } from '../../../lib/format'
import { getAnalyticsBreakdowns, getAnalyticsSummary } from '../../../lib/api/analytics'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import { getRegisterExport, getRegisterPage } from '../../../lib/api/register'
import type { CorrectionResult } from '../../../lib/api/corrections'
import StateMessage from '../../../shared/components/StateMessage'
import StatusBadge from '../../../shared/components/StatusBadge'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../../contribute/types'
import type { ContributionReferenceData } from '../../contribute/types'
import CorrectionDialog from '../components/CorrectionDialog'
import type { EquipmentRecord, EquipmentSort, SortDirection } from '../types'
import '../equipment.css'

interface EquipmentPageProps {
  /** Test/demo override; normal application runtime always uses the live API. */
  records?: EquipmentRecord[]
}

const PAGE_SIZES = [10, 25, 50]

function sortDirectionFor(key: EquipmentSort): SortDirection {
  return key === 'quantity' || key === 'commissioning' ? 'desc' : 'asc'
}

function DemoEquipmentPage({ records }: { records: EquipmentRecord[] }) {
  const [query, setQuery] = useState('')
  const [supplier, setSupplier] = useState('all')
  const [status, setStatus] = useState('all')
  const [year, setYear] = useState('all')
  const [sort, setSort] = useState<EquipmentSort>('site')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const suppliers = useMemo(() => Array.from(new Set(records.map((record) => record.supplier))).sort(), [records])
  const commissioningYears = useMemo(() => Array.from(new Set(records.map((record) => record.commissioningDate?.slice(0, 4)).filter((value): value is string => value !== undefined))).sort((left, right) => right.localeCompare(left)), [records])
  const visibleRecords = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    const filtered = records.filter((record) => {
      const searchable = [record.siteName, record.machineModel, record.machineType, record.manufacturer, record.supplier].filter(Boolean).join(' ').toLowerCase()
      return (!normalisedQuery || searchable.includes(normalisedQuery)) && (supplier === 'all' || record.supplier === supplier) && (status === 'all' || record.status === status) && (year === 'all' || (year === 'unknown' && record.commissioningDate === undefined) || record.commissioningDate?.startsWith(year))
    })
    return [...filtered].sort((left, right) => {
      let comparison = 0
      if (sort === 'quantity') comparison = left.quantity - right.quantity
      if (sort === 'supplier') comparison = left.supplier.localeCompare(right.supplier)
      if (sort === 'status') comparison = left.status.localeCompare(right.status)
      if (sort === 'commissioning') comparison = (left.commissioningDate ?? '').localeCompare(right.commissioningDate ?? '')
      if (sort === 'site') comparison = left.siteName.localeCompare(right.siteName)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [query, records, sort, sortDirection, status, supplier, year])

  function handleSort(nextSort: EquipmentSort) {
    if (nextSort === sort) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSort(nextSort); setSortDirection(sortDirectionFor(nextSort)) }
  }

  function sortButtonLabel(label: string, key: EquipmentSort): string {
    return sort !== key ? `Sort by ${label}` : `Sort by ${label}, ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
  }

  function sortIndicator(key: EquipmentSort): string {
    return sort !== key ? '↕' : sortDirection === 'asc' ? '↑' : '↓'
  }

  function sortState(key: EquipmentSort): 'ascending' | 'descending' | 'none' {
    return sort !== key ? 'none' : sortDirection === 'asc' ? 'ascending' : 'descending'
  }

  return <EquipmentShell title="Equipment Register" intro="Search, filter and export verified equipment records from the project API." exportDisabled={visibleRecords.length === 0} onExport={() => undefined}>
    <div className="filter-panel" aria-label="Equipment filters">
      <label>Search<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Site, model or company" /></label>
      <label>Supplier<select value={supplier} onChange={(event) => setSupplier(event.target.value)}><option value="all">All suppliers</option>{suppliers.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{['operational', 'commissioning', 'announced', 'decommissioned', 'unknown'].map((option) => <option key={option} value={option}>{formatEnumLabel(option === 'unknown' ? null : option)}</option>)}</select></label>
      <label>Commissioning year<select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{commissioningYears.map((option) => <option key={option} value={option}>{option}</option>)}<option value="unknown">Not recorded</option></select></label>
    </div>
    <p className="result-summary" aria-live="polite">{formatNumber(visibleRecords.length)} records shown</p>
    {visibleRecords.length === 0 ? <StateMessage title="No matching equipment" message="Change or clear one of the filters to see more records." /> : <EquipmentTable records={visibleRecords} onSort={handleSort} sortButtonLabel={sortButtonLabel} sortIndicator={sortIndicator} sortState={sortState} />}
  </EquipmentShell>
}

interface RegisterView {
  filters: { q?: string; siteId?: string; country?: string; region?: string; commodity?: string; supplier?: string; manufacturer?: string; machineType?: string; automationLevel?: string; environment?: string; status?: string }
  sort: EquipmentSort
  order: SortDirection
  page: number
  pageSize: number
}

const EMPTY_VIEW: RegisterView = { filters: {}, sort: 'site', order: 'asc', page: 1, pageSize: 25 }

function readView(): RegisterView {
  if (typeof window === 'undefined') return EMPTY_VIEW
  const params = new URLSearchParams(window.location.search)
  const filters: RegisterView['filters'] = {}
  const keys = ['q', 'site_id', 'country', 'region', 'commodity', 'supplier', 'manufacturer', 'machine_type', 'automation_level', 'environment', 'status'] as const
  const map: Record<typeof keys[number], keyof RegisterView['filters']> = { q: 'q', site_id: 'siteId', country: 'country', region: 'region', commodity: 'commodity', supplier: 'supplier', manufacturer: 'manufacturer', machine_type: 'machineType', automation_level: 'automationLevel', environment: 'environment', status: 'status' }
  for (const key of keys) { const value = params.get(key); if (value) filters[map[key]] = value }
  const page = Number(params.get('page'))
  const pageSize = Number(params.get('page_size'))
  const sort = params.get('sort') as EquipmentSort | null
  const order = params.get('order') as SortDirection | null
  return { filters, sort: sort && ['site', 'country', 'manufacturer', 'machine_type', 'supplier', 'status', 'quantity', 'commissioning'].includes(sort) ? sort : 'site', order: order === 'desc' ? 'desc' : 'asc', page: Number.isInteger(page) && page > 0 ? page : 1, pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : 25 }
}

function writeView(view: RegisterView) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()
  const map: Array<[keyof RegisterView['filters'], string]> = [['q', 'q'], ['siteId', 'site_id'], ['country', 'country'], ['region', 'region'], ['commodity', 'commodity'], ['supplier', 'supplier'], ['manufacturer', 'manufacturer'], ['machineType', 'machine_type'], ['automationLevel', 'automation_level'], ['environment', 'environment'], ['status', 'status']]
  for (const [field, key] of map) { const value = view.filters[field]; if (value) params.set(key, value) }
  if (view.sort !== 'site') params.set('sort', view.sort)
  if (view.order !== 'asc') params.set('order', view.order)
  if (view.page !== 1) params.set('page', String(view.page))
  if (view.pageSize !== 25) params.set('page_size', String(view.pageSize))
  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

function LiveEquipmentPage() {
  const [view, setView] = useState<RegisterView>(readView)
  const [records, setRecords] = useState<EquipmentRecord[]>([])
  const [summary, setSummary] = useState({ machineCount: 0, siteCount: 0, countryCount: 0 })
  const [breakdowns, setBreakdowns] = useState({
    byCountry: [] as Array<{ key: string | null; machineCount: number }>,
    bySupplier: [] as Array<{ key: string | null; machineCount: number }>,
    byStatus: [] as Array<{ key: string | null; machineCount: number }>,
  })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState<ContributionReferenceData>(DEFAULT_CONTRIBUTION_REFERENCE_DATA)
  const [moreFilters, setMoreFilters] = useState(false)
  const [correctionRecord, setCorrectionRecord] = useState<EquipmentRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let active = true
    getContributionReferenceData().then((data) => active && setReference(data)).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const offset = (view.page - 1) * view.pageSize
    Promise.all([
      getRegisterPage({ ...view.filters, sort: view.sort, order: view.order, limit: view.pageSize, offset }),
      getAnalyticsSummary(view.filters),
      getAnalyticsBreakdowns(view.filters),
    ]).then(([page, nextSummary, nextBreakdowns]) => {
      if (!active) return
      setRecords(page.records)
      setSummary({
        machineCount: nextSummary.machine_count,
        siteCount: nextSummary.site_count,
        countryCount: nextSummary.country_count,
      })
      setBreakdowns({
        byCountry: nextBreakdowns.by_country.map(({ key, machine_count }) => ({ key, machineCount: machine_count })),
        bySupplier: nextBreakdowns.by_supplier.map(({ key, machine_count }) => ({ key, machineCount: machine_count })),
        byStatus: nextBreakdowns.by_status.map(({ key, machine_count }) => ({ key, machineCount: machine_count })),
      })
      setTotal(page.total)
      setError(null)
      setLoading(false)
    }).catch((cause: unknown) => {
      if (!active) return
      setError(cause instanceof Error ? cause.message : 'Unable to load the register')
      setLoading(false)
    })
    return () => { active = false }
  }, [refreshToken, view])

  function updateView(next: RegisterView) {
    setLoading(true)
    setNotice(null)
    setView(next)
    writeView(next)
  }

  function setFilter(field: keyof RegisterView['filters'], value: string) {
    const filters = { ...view.filters }
    if (value) filters[field] = value
    else delete filters[field]
    updateView({ ...view, filters, page: 1 })
  }

  function clearFilters() { updateView({ ...EMPTY_VIEW, pageSize: view.pageSize }) }

  function exportCsv() {
    getRegisterExport({ ...view.filters, sort: view.sort, order: view.order }).then((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'autonomous-mining-equipment.csv'
      link.click()
      URL.revokeObjectURL(url)
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to export the register'))
  }

  const supplierOptions = breakdowns.bySupplier.flatMap(({ key }) => key ? [key] : []).sort()
  const countryOptions = breakdowns.byCountry.flatMap(({ key }) => key ? [key] : []).sort()
  const statuses = breakdowns.byStatus.reduce<Record<string, number>>((counts, { key, machineCount }) => {
    const status = key ?? 'unknown'
    counts[status] = machineCount
    return counts
  }, {})
  const machineTotal = summary.machineCount
  const siteTotal = summary.siteCount
  const countryTotal = summary.countryCount
  const first = total === 0 ? 0 : (view.page - 1) * view.pageSize + 1
  const last = total === 0 ? 0 : Math.min(total, first + records.length - 1)
  const pageCount = Math.max(1, Math.ceil(total / view.pageSize))

  function handleCorrectionSubmitted(result: CorrectionResult) {
    setCorrectionRecord(null)
    // A correction to a verified record is a proposal, so the register does not change until it is approved
    if (result.correctionId !== null) {
      setNotice('Correction submitted for review. The record stays public and unchanged until an administrator approves the change.')
      return
    }
    setNotice('Correction submitted for review.')
    setLoading(true)
    setRefreshToken((current) => current + 1)
  }

  return <>
    <EquipmentShell title="Equipment Register" intro="Search, filter and export verified equipment records from the project API." exportDisabled={total === 0} onExport={exportCsv}>
    <div className="register-totals" aria-label="Register totals"><article><span>Deployments</span><strong>{formatNumber(total)}</strong></article><article><span>Machines</span><strong>{formatNumber(machineTotal)}</strong><div className="register-status-stack">{Object.entries(statuses).map(([status, count]) => <span key={status} className={`register-status-stack__segment register-status-stack__segment--${status}`} style={{ width: `${machineTotal ? (count / machineTotal) * 100 : 0}%` }} title={`${formatEnumLabel(status)}: ${formatNumber(count)}`} />)}</div><small>{Object.entries(statuses).map(([status, count]) => `${formatEnumLabel(status)} ${formatNumber(count)}`).join(' · ')}</small></article><article><span>Mine sites</span><strong>{formatNumber(siteTotal)}</strong></article><article><span>Countries</span><strong>{formatNumber(countryTotal)}</strong></article></div>
    <section className="filter-panel register-filters" aria-label="Equipment filters">
      <label>Search<input type="search" value={view.filters.q ?? ''} onChange={(event) => setFilter('q', event.target.value)} placeholder="Site, model or company" /></label>
      <FilterSelect label="Machine type" value={view.filters.machineType} options={reference.machineTypes} onChange={(value) => setFilter('machineType', value)} />
      <FilterSelect label="Automation" value={view.filters.automationLevel} options={reference.automationLevels} onChange={(value) => setFilter('automationLevel', value)} />
      <FilterSelect label="Status" value={view.filters.status} options={reference.deploymentStatuses} onChange={(value) => setFilter('status', value)} />
      <FilterSelect label="Environment" value={view.filters.environment} options={reference.environments} onChange={(value) => setFilter('environment', value)} />
      <label>Technology supplier<select value={view.filters.supplier ?? ''} onChange={(event) => setFilter('supplier', event.target.value)}><option value="">All suppliers</option>{supplierOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Country<select value={view.filters.country ?? ''} onChange={(event) => setFilter('country', event.target.value)}><option value="">All countries</option>{countryOptions.map((value) => <option key={value} value={value}>{formatCountry(value)}</option>)}</select></label>
      <button className="button button--secondary" type="button" onClick={() => setMoreFilters((current) => !current)}>{moreFilters ? 'Hide more filters' : 'More filters'}</button>
      <button className="button button--secondary" type="button" onClick={clearFilters} disabled={Object.keys(view.filters).length === 0}>Clear all</button>
      {moreFilters && <><label>Manufacturer<input value={view.filters.manufacturer ?? ''} onChange={(event) => setFilter('manufacturer', event.target.value)} /></label><label>Region<input value={view.filters.region ?? ''} onChange={(event) => setFilter('region', event.target.value)} /></label><label>Commodity<input value={view.filters.commodity ?? ''} onChange={(event) => setFilter('commodity', event.target.value)} /></label></>}
    </section>
    {error && <StateMessage variant="error" title="Unable to load the register" message={`${error}. Check that the backend is running and try again.`} />}
    {loading && records.length === 0 && !error && <StateMessage variant="loading" title="Loading live records" message="Connecting to the backend API…" />}
    <div className="register-results-bar"><p className="result-summary" aria-live="polite">Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}</p>{loading && records.length > 0 && <span role="status">Updating…</span>}<label>Rows per page<select value={view.pageSize} onChange={(event) => updateView({ ...view, page: 1, pageSize: Number(event.target.value) })}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label></div>
    {notice && <p className="form-summary-success" role="status">{notice}</p>}
    {!loading && !error && records.length === 0 ? <StateMessage title="No matching equipment" message="Change or clear one of the filters to see more records." /> : records.length > 0 && <EquipmentTable records={records} onCorrect={setCorrectionRecord} onSort={(sort) => updateView({ ...view, sort, order: sort === view.sort ? view.order === 'asc' ? 'desc' : 'asc' : sortDirectionFor(sort), page: 1 })} sortButtonLabel={(label, key) => view.sort !== key ? `Sort by ${label}` : `Sort by ${label}, ${view.order === 'asc' ? 'ascending' : 'descending'}`} sortIndicator={(key) => view.sort !== key ? '↕' : view.order === 'asc' ? '↑' : '↓'} sortState={(key) => view.sort !== key ? 'none' : view.order === 'asc' ? 'ascending' : 'descending'} />}
    <nav className="pagination" aria-label="Register pages"><button className="button button--secondary" type="button" disabled={view.page <= 1 || loading} onClick={() => updateView({ ...view, page: view.page - 1 })}>Previous</button><span>Page {formatNumber(view.page)} of {formatNumber(pageCount)}</span><button className="button button--secondary" type="button" disabled={view.page >= pageCount || loading} onClick={() => updateView({ ...view, page: view.page + 1 })}>Next</button></nav>
    </EquipmentShell>
    {correctionRecord && <CorrectionDialog record={correctionRecord} referenceData={reference} onClose={() => setCorrectionRecord(null)} onSubmitted={handleCorrectionSubmitted} />}
  </>
}

function FilterSelect({ label, value, options, onChange }: { label: string; value?: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  const allLabel = label === 'Automation' ? 'All automation levels' : label === 'Machine type' ? 'All machine types' : label === 'Status' ? 'All statuses' : label === 'Environment' ? 'All environments' : 'All'
  return <label>{label}<select value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">{allLabel}</option>{options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}</select></label>
}

function EquipmentShell({ title, intro, children, exportDisabled, onExport }: { title: string; intro: string; children: ReactNode; exportDisabled: boolean; onExport: () => void }) {
  return <section className="product-page"><header className="page-heading"><div><p className="eyebrow">Recorded deployments</p><h1>{title}</h1><p className="intro">{intro}</p></div><button className="button button--primary" type="button" aria-label="Export CSV" onClick={onExport} disabled={exportDisabled}>Download CSV</button></header>{children}</section>
}

function EquipmentTable({ records, onCorrect, onSort, sortButtonLabel, sortIndicator, sortState }: { records: EquipmentRecord[]; onCorrect?: (record: EquipmentRecord) => void; onSort: (sort: EquipmentSort) => void; sortButtonLabel: (label: string, key: EquipmentSort) => string; sortIndicator: (key: EquipmentSort) => string; sortState: (key: EquipmentSort) => 'ascending' | 'descending' | 'none' }) {
  const header = (label: string, key: EquipmentSort) => <th aria-sort={sortState(key)}><button className="table-sort-button" type="button" onClick={() => onSort(key)} aria-label={sortButtonLabel(label, key)}>{label} <span aria-hidden="true">{sortIndicator(key)}</span></button></th>
  return <div className="table-scroll" tabIndex={0} role="region" aria-label="Equipment records table"><table><thead><tr><th>Machine</th>{header('Type', 'machine_type')}<th>Mine site</th>{header('Technology', 'supplier')}<th>Automation</th>{header('Quantity', 'quantity')}<th>Commissioned</th>{header('Status', 'status')}<th aria-label="Actions" /></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{record.machineModel ?? formatEnumLabel(record.machineType)}</strong><small>{record.manufacturer} · {record.modelVariant ? formatEnumLabel(record.modelVariant) : 'Not recorded'}</small></td><td>{formatEnumLabel(record.machineType)}</td><td><strong>{record.siteName}</strong><small>{record.region}, {formatCountry(record.country)}</small></td><td>{record.supplier}<small>{record.technologyProduct ?? 'Not recorded'}</small></td><td>{formatEnumLabel(record.automationLevel)}</td><td className="numeric">{formatNumber(record.quantity)}</td><td>{formatCommissioning(record.commissioningDate, undefined)}</td><td><StatusBadge status={record.status} /></td><td><button className="table-link" type="button" disabled={!onCorrect} title={!onCorrect ? 'Correction workflow is not available in fixture mode' : undefined} aria-label={`Correct ${record.siteName}`} onClick={() => onCorrect?.(record)}>Correct</button></td></tr>)}</tbody></table></div>
}

function EquipmentPage({ records: suppliedRecords }: EquipmentPageProps = {}) {
  return suppliedRecords === undefined ? <LiveEquipmentPage /> : <DemoEquipmentPage records={suppliedRecords} />
}

export default EquipmentPage
