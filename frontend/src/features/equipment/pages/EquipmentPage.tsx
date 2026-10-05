import { useMemo, useState } from 'react'
import { formatDate, formatEnumLabel, formatNumber } from '../../../lib/format'
import { useLiveRegister } from '../../../hooks/useLiveRegister'
import StateMessage from '../../../shared/components/StateMessage'
import StatusBadge from '../../../shared/components/StatusBadge'
import type { EquipmentRecord, EquipmentSort, SortDirection } from '../types'
import '../equipment.css'

interface EquipmentPageProps {
  /** Test/demo override; normal application runtime always uses the live API. */
  records?: EquipmentRecord[]
}

const CSV_HEADERS = ['Site', 'Country', 'Machine', 'Type', 'Manufacturer', 'Supplier', 'Status', 'Quantity']

function escapeCsv(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function sortDirectionFor(key: EquipmentSort): SortDirection {
  return key === 'quantity' || key === 'commissioning' ? 'desc' : 'asc'
}

function EquipmentPage({ records: suppliedRecords }: EquipmentPageProps = {}) {
  const { records: liveRecords, loading: liveLoading, error: liveError } = useLiveRegister(suppliedRecords === undefined)
  const records: EquipmentRecord[] = suppliedRecords ?? liveRecords
  const loading = suppliedRecords === undefined && liveLoading
  const error = suppliedRecords === undefined ? liveError : null
  const [query, setQuery] = useState('')
  const [supplier, setSupplier] = useState('all')
  const [status, setStatus] = useState('all')
  const [year, setYear] = useState('all')
  const [sort, setSort] = useState<EquipmentSort>('site')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const suppliers = useMemo(
    () => Array.from(new Set(records.map((record) => record.supplier))).sort(),
    [records],
  )

  const commissioningYears = useMemo(
    () => Array.from(new Set(records
      .map((record) => record.commissioningDate?.slice(0, 4))
      .filter((value): value is string => value !== undefined)))
      .sort((left, right) => right.localeCompare(left)),
    [records],
  )

  const visibleRecords = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    const filtered = records.filter((record) => {
      const searchable = [record.siteName, record.machineModel, record.machineType, record.manufacturer, record.supplier]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (
        (!normalisedQuery || searchable.includes(normalisedQuery)) &&
        (supplier === 'all' || record.supplier === supplier) &&
        (status === 'all' || record.status === status) &&
        (year === 'all' ||
          (year === 'unknown' && record.commissioningDate === undefined) ||
          record.commissioningDate?.startsWith(year))
      )
    })

    return [...filtered].sort((left, right) => {
      let comparison = 0
      if (sort === 'quantity') comparison = left.quantity - right.quantity
      if (sort === 'supplier') comparison = left.supplier.localeCompare(right.supplier)
      if (sort === 'status') comparison = left.status.localeCompare(right.status)
      if (sort === 'commissioning') {
        if (left.commissioningDate === undefined && right.commissioningDate !== undefined) return 1
        if (left.commissioningDate !== undefined && right.commissioningDate === undefined) return -1
        comparison = (left.commissioningDate ?? '').localeCompare(right.commissioningDate ?? '')
      }
      if (sort === 'site') comparison = left.siteName.localeCompare(right.siteName)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [query, records, sort, sortDirection, status, supplier, year])

  function handleSort(nextSort: EquipmentSort) {
    if (nextSort === sort) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setSort(nextSort)
    setSortDirection(sortDirectionFor(nextSort))
  }

  function sortButtonLabel(label: string, key: EquipmentSort): string {
    if (sort !== key) return `Sort by ${label}`
    return `Sort by ${label}, ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
  }

  function sortIndicator(key: EquipmentSort): string {
    if (sort !== key) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  function sortState(key: EquipmentSort): 'ascending' | 'descending' | 'none' {
    if (sort !== key) return 'none'
    return sortDirection === 'asc' ? 'ascending' : 'descending'
  }

  function exportCsv() {
    const rows = visibleRecords.map((record) => [
      record.siteName,
      record.country,
      record.machineModel ?? 'Not recorded',
      record.machineType,
      record.manufacturer,
      record.supplier,
      record.status,
      record.quantity,
    ])
    const csv = [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'autonomous-mining-equipment.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="product-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Recorded deployments</p>
          <h1>Equipment Register</h1>
          <p className="intro">Search, filter and export verified equipment records from the project API.</p>
        </div>
        <button className="button button--primary" type="button" onClick={exportCsv} disabled={visibleRecords.length === 0}>
          Export CSV
        </button>
      </header>

      {loading && <StateMessage variant="loading" title="Loading live records" message="Connecting to the backend API…" />}
      {error && <StateMessage variant="error" title="Unable to load the register" message={`${error}. Check that the backend is running and try again.`} />}

      {!loading && !error && <div className="filter-panel" aria-label="Equipment filters">
        <label>
          Search
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Site, model or company" />
        </label>
        <label>
          Supplier
          <select value={supplier} onChange={(event) => setSupplier(event.target.value)}>
            <option value="all">All suppliers</option>
            {suppliers.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="operational">Operational</option>
            <option value="commissioning">Commissioning</option>
            <option value="announced">Announced</option>
            <option value="decommissioned">Decommissioned</option>
            <option value="unknown">Not recorded</option>
          </select>
        </label>
        <label>
          Commissioning year
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">All years</option>
            {commissioningYears.map((option) => <option key={option} value={option}>{option}</option>)}
            <option value="unknown">Not recorded</option>
          </select>
        </label>
      </div>}

      {!loading && !error && <p className="result-summary" aria-live="polite">{formatNumber(visibleRecords.length)} records shown</p>}

      {!loading && !error && visibleRecords.length === 0 ? (
        <StateMessage title="No matching equipment" message="Change or clear one of the filters to see more records." />
      ) : !loading && !error ? (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Equipment records table">
          <table>
            <thead>
              <tr>
                <th aria-sort={sortState('site')}>
                  <button className="table-sort-button" type="button" onClick={() => handleSort('site')} aria-label={sortButtonLabel('site name', 'site')}>
                    Site <span aria-hidden="true">{sortIndicator('site')}</span>
                  </button>
                </th>
                <th>Machine</th>
                <th>Manufacturer</th>
                <th aria-sort={sortState('supplier')}>
                  <button className="table-sort-button" type="button" onClick={() => handleSort('supplier')} aria-label={sortButtonLabel('supplier', 'supplier')}>
                    Technology supplier <span aria-hidden="true">{sortIndicator('supplier')}</span>
                  </button>
                </th>
                <th aria-sort={sortState('status')}>
                  <button className="table-sort-button" type="button" onClick={() => handleSort('status')} aria-label={sortButtonLabel('status', 'status')}>
                    Status <span aria-hidden="true">{sortIndicator('status')}</span>
                  </button>
                </th>
                <th>Environment</th>
                <th aria-sort={sortState('commissioning')}>
                  <button className="table-sort-button" type="button" onClick={() => handleSort('commissioning')} aria-label={sortButtonLabel('commissioning date', 'commissioning')}>
                    Commissioning <span aria-hidden="true">{sortIndicator('commissioning')}</span>
                  </button>
                </th>
                <th aria-sort={sortState('quantity')} className="numeric">
                  <button className="table-sort-button" type="button" onClick={() => handleSort('quantity')} aria-label={sortButtonLabel('quantity', 'quantity')}>
                    Quantity <span aria-hidden="true">{sortIndicator('quantity')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.siteName}</strong><small>{record.region}, {record.country}</small></td>
                  <td>{record.machineModel ?? formatEnumLabel(record.machineType)}<small>{formatEnumLabel(record.automationLevel)}</small></td>
                  <td>{record.manufacturer}</td>
                  <td>{record.supplier}</td>
                  <td><StatusBadge status={record.status} /></td>
                  <td>{formatEnumLabel(record.environment)}</td>
                  <td>{formatDate(record.commissioningDate)}</td>
                  <td className="numeric">{formatNumber(record.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

export default EquipmentPage
