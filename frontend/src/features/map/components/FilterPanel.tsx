import { useEffect, useRef, useState } from 'react'

import type { MapMarker } from '../../../lib/api/types'
import { formatCountry, formatEnumLabel, formatNumber } from '../../../lib/format'
import type { MapOptions } from '../useMapData'
import MapIcon from './MapIcon'

export interface MapFilters {
  supplier: string
  machineType: string
  country: string
  automationLevel: string
  region: string
  commodity: string
  environment: string
}

export const NO_FILTERS: MapFilters = { supplier: '', machineType: '', country: '', automationLevel: '', region: '', commodity: '', environment: '' }

interface FilterPanelProps {
  options: MapOptions | null
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  includeDecommissioned: boolean
  onIncludeDecommissionedChange: (include: boolean) => void
  onClear: () => void
  markers: readonly MapMarker[]
  selectedId: number | null
  onSelectSite: (id: number) => void
  onCollapse: () => void
}

function SelectFilter({ id, label, value, allLabel, options, onChange }: {
  id: string
  label: string
  value: string
  allLabel: string
  options: readonly (readonly [string, string])[]
  onChange: (value: string) => void
}) {
  return (
    <div className="map-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  )
}

function FilterPanel({
  options, filters, onFiltersChange, includeDecommissioned, onIncludeDecommissionedChange, onClear,
  markers, selectedId, onSelectSite, onCollapse,
}: FilterPanelProps) {
  const [moreOpen, setMoreOpen] = useState(Boolean(filters.region || filters.commodity || filters.environment))
  const moreFilters = useRef<HTMLDivElement>(null)

  // Bring the filters just revealed into view when the panel has to scroll for them
  useEffect(() => {
    if (moreOpen) moreFilters.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [moreOpen])
  const set = (key: keyof MapFilters) => (value: string) => {
    // A region belongs to one country, so changing the country clears it
    onFiltersChange({ ...filters, [key]: value, ...(key === 'country' ? { region: '' } : {}) })
  }
  const machines = markers.reduce((total, marker) => total + marker.machineCount, 0)
  const regions = (options?.regions ?? []).filter((region) => !filters.country || region.countryCode === filters.country)
  const active = Object.values(filters).some(Boolean) || includeDecommissioned

  return (
    <aside className="map-panel" id="map-panel" aria-label="Filters and sites">
      <div className="map-panel__header">
        <div>
          <h1 className="map-panel__title">Mine sites</h1>
          <p className="map-panel__count" aria-live="polite">
            <strong>{formatNumber(markers.length)}</strong> {markers.length === 1 ? 'site' : 'sites'} · <strong>{formatNumber(machines)}</strong> machines in service
          </p>
        </div>
        <button type="button" className="map-icon-button" aria-expanded="true" aria-controls="map-panel" title="Hide filters and sites" onClick={onCollapse}>
          <MapIcon name="chevronLeft" /><span className="visually-hidden">Hide filters and sites</span>
        </button>
      </div>

      <form className="map-filters" aria-label="Map filters" onSubmit={(event) => event.preventDefault()}>
        <SelectFilter id="map-supplier" label="Technology supplier" value={filters.supplier} allLabel="All suppliers"
          options={(options?.suppliers ?? []).map((supplier) => [supplier, supplier] as const)} onChange={set('supplier')} />
        <SelectFilter id="map-machine-type" label="Machine type" value={filters.machineType} allLabel="All machine types"
          options={options?.machineTypes ?? []} onChange={set('machineType')} />
        <SelectFilter id="map-country" label="Country" value={filters.country} allLabel="All countries"
          options={options?.countries ?? []} onChange={set('country')} />

        <fieldset className="map-chips">
          <legend>Automation level</legend>
          {[['', 'Any'] as const, ...(options?.automationLevels ?? [])].map(([value, label]) => (
            <label key={value || 'any'} className="map-chip">
              <input type="radio" name="map-automation" value={value} checked={filters.automationLevel === value} onChange={() => set('automationLevel')(value)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <label className="map-check">
          <input type="checkbox" checked={includeDecommissioned} onChange={(event) => onIncludeDecommissionedChange(event.target.checked)} />
          Include decommissioned deployments
        </label>

        <div className="map-filters__row">
          <button type="button" className="map-text-button map-disclosure" aria-expanded={moreOpen} aria-controls="map-more-filters" onClick={() => setMoreOpen(!moreOpen)}>
            <MapIcon name="chevronDown" size={16} /> More filters
          </button>
          <button type="button" className="map-text-button" onClick={onClear} disabled={!active}>
            <MapIcon name="reset" size={16} /> Clear all
          </button>
        </div>
        {moreOpen && (
          <div id="map-more-filters" className="map-more" ref={moreFilters}>
            <SelectFilter id="map-region" label="Region" value={filters.region} allLabel="All regions"
              options={regions.map((region) => [region.name, region.name] as const)} onChange={set('region')} />
            <SelectFilter id="map-commodity" label="Commodity" value={filters.commodity} allLabel="All commodities"
              options={(options?.commodities ?? []).map((commodity) => [commodity, formatEnumLabel(commodity)] as const)} onChange={set('commodity')} />
            <SelectFilter id="map-environment" label="Mining environment" value={filters.environment} allLabel="Any environment"
              options={options?.environments ?? []} onChange={set('environment')} />
          </div>
        )}

      </form>

      <section className="map-sites" aria-labelledby="map-sites-heading">
        <h2 id="map-sites-heading">Sites in view <span>{formatNumber(markers.length)}</span></h2>
        <ul>
          {markers.map((marker) => (
            <li key={marker.id}>
              <button type="button" className="map-site" data-site-id={marker.id} aria-pressed={marker.id === selectedId} onClick={() => onSelectSite(marker.id)}>
                <svg className="map-site__marker" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <circle className={`site-marker site-marker--${marker.status}`} cx="7" cy="7" r="5" />
                </svg>
                <span className="map-site__text">
                  <strong>{marker.name}</strong>
                  <small>{[marker.region, formatCountry(marker.countryCode)].filter(Boolean).join(', ')}</small>
                </span>
                <span className="map-site__count">{formatNumber(marker.machineCount)}<span className="visually-hidden"> machines in service</span></span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}

export default FilterPanel
