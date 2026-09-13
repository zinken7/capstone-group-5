import { useMemo, useState } from 'react'
import StateMessage from '../../../shared/components/StateMessage'
import type { EquipmentRecord, EquipmentSort } from '../types'
import '../equipment.css'

interface EquipmentPageProps {
  records: EquipmentRecord[]
}

const CSV_HEADERS = ['Site', 'Country', 'Machine', 'Type', 'Manufacturer', 'Supplier', 'Status', 'Quantity']

function escapeCsv(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function EquipmentPage({ records }: EquipmentPageProps) {
  const [query, setQuery] = useState('')
  const [supplier, setSupplier] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<EquipmentSort>('site')

  const suppliers = useMemo(
    () => Array.from(new Set(records.map((record) => record.supplier))).sort(),
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
        (status === 'all' || record.status === status)
      )
    })

    return [...filtered].sort((left, right) => {
      if (sort === 'quantity-desc') return right.quantity - left.quantity
      if (sort === 'supplier') return left.supplier.localeCompare(right.supplier)
      if (sort === 'status') return left.status.localeCompare(right.status)
      return left.siteName.localeCompare(right.siteName)
    })
  }, [query, records, sort, status, supplier])

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
          <p className="intro">Search, filter and export autonomous equipment records.</p>
        </div>
        <button className="button button--primary" type="button" onClick={exportCsv} disabled={visibleRecords.length === 0}>
          Export CSV
        </button>
      </header>

      <div className="filter-panel" aria-label="Equipment filters">
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
          </select>
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value as EquipmentSort)}>
            <option value="site">Site name</option>
            <option value="quantity-desc">Quantity: high to low</option>
            <option value="supplier">Supplier</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>

      <p className="result-summary" aria-live="polite">{visibleRecords.length} records shown</p>

      {visibleRecords.length === 0 ? (
        <StateMessage title="No matching equipment" message="Change or clear one of the filters to see more records." />
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Equipment records table">
          <table>
            <thead>
              <tr><th>Site</th><th>Machine</th><th>Manufacturer</th><th>Technology supplier</th><th>Status</th><th>Environment</th><th className="numeric">Quantity</th></tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.siteName}</strong><small>{record.region}, {record.country}</small></td>
                  <td>{record.machineModel ?? record.machineType}<small>{record.automationLevel}</small></td>
                  <td>{record.manufacturer}</td>
                  <td>{record.supplier}</td>
                  <td><span className={`status-badge status-badge--${record.status}`}>{record.status}</span></td>
                  <td>{record.environment}</td>
                  <td className="numeric">{record.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default EquipmentPage
