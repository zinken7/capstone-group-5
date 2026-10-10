import type { Map as LeafletMap } from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { MapQuery, MiningEnvironment } from '../../../lib/api/types'
import { formatNumber } from '../../../lib/format'
import FilterPanel, { NO_FILTERS } from '../components/FilterPanel'
import MapIcon from '../components/MapIcon'
import type { MapFilters } from '../components/FilterPanel'
import SiteCard from '../components/SiteCard'
import SiteMap, { fitToMarkers } from '../components/SiteMap'
import { markerRadius } from '../geometry'
import { useDelayedFlag, useMapData, useMapOptions } from '../useMapData'
import '../map.css'

const LEGEND_STATUSES = [
  ['operational', 'Operational'],
  ['commissioning', 'Commissioning'],
  ['announced', 'Announced'],
  ['decommissioned', 'Decommissioned only'],
] as const
const LEGEND_SIZES = [10, 25, 50]
// Year changes from the slider settle before a request goes out
const YEAR_DELAY_MS = 250

function toQuery(filters: MapFilters, year: number, includeDecommissioned: boolean): MapQuery {
  return {
    supplier: filters.supplier || undefined,
    machineType: filters.machineType || undefined,
    country: filters.country || undefined,
    automationLevel: filters.automationLevel || undefined,
    region: filters.region || undefined,
    commodity: filters.commodity || undefined,
    environment: (filters.environment || undefined) as MiningEnvironment | undefined,
    year,
    includeDecommissioned,
  }
}

function MapPage() {
  const currentYear = new Date().getFullYear()
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS)
  const [includeDecommissioned, setIncludeDecommissioned] = useState(false)
  const [yearInput, setYearInput] = useState(currentYear)
  const [year, setYear] = useState(currentYear)
  const [panelOpen, setPanelOpen] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const panelTogglePending = useRef(false)
  const [fullscreen, setFullscreen] = useState(false)

  const options = useMapOptions()
  const data = useMapData(toQuery(filters, year, includeDecommissioned))
  const markers = useMemo(() => [...data.markers].sort((a, b) => a.name.localeCompare(b.name)), [data.markers])
  const selected = markers.find((marker) => marker.id === selectedId) ?? null
  // Most requests return within a blink; only a slow one earns a loading bar
  const slowUpdate = useDelayedFlag(data.updating && !data.initialLoad, 400)
  const firstYear = Math.min(options?.firstYear ?? currentYear - 12, currentYear)

  useEffect(() => {
    const timer = setTimeout(() => setYear(yearInput), YEAR_DELAY_MS)
    return () => clearTimeout(timer)
  }, [yearInput])

  useEffect(() => {
    if (!panelTogglePending.current) return
    panelTogglePending.current = false
    document.querySelector<HTMLButtonElement>(panelOpen ? '#hide-map-panel' : '#show-map-panel')?.focus()
  }, [panelOpen])

  const onMapReady = useCallback((instance: LeafletMap) => setMap(instance), [])

  // Esc, or the browser's own control, can also leave full screen; either way the map refits to its new size
  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement !== null && document.fullscreenElement === stage.current)
      if (!map) return
      map.invalidateSize()
      fitToMarkers(map, markers)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [map, markers])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.current?.requestFullscreen()
  }

  // Leaflet cannot animate a map that has no size yet
  const flyTo = (latitude: number, longitude: number, zoom: number) => {
    if (map && map.getSize().x > 0) map.flyTo([latitude, longitude], zoom, { duration: 0.6 })
  }

  const selectSite = (id: number) => {
    setSelectedId(id)
    const marker = markers.find((item) => item.id === id)
    // Focus the selected site immediately. On phones, MapEffects applies the
    // selected-sheet padding after the card has mounted so the marker stays
    // above the sheet.
    if (map && marker) flyTo(marker.latitude, marker.longitude, Math.max(map.getZoom(), 5))
  }

  const closeCard = () => {
    const id = selectedId
    setSelectedId(null)
    setLegendOpen(false)
    // Back to the site in the list, so keyboard users keep their place
    if (id !== null) document.querySelector<HTMLButtonElement>(`[data-site-id="${id}"]`)?.focus()
  }

  const clearAll = () => {
    setFilters(NO_FILTERS)
    setIncludeDecommissioned(false)
  }

  const setPanelVisibility = (open: boolean) => {
    panelTogglePending.current = true
    setPanelOpen(open)
  }

  const machines = markers.reduce((total, marker) => total + marker.machineCount, 0)
  const countries = new Set(markers.map((marker) => marker.countryCode)).size
  // A site that leaves the view after a filter change drops its card with it
  const card = selected

  return (
    <section className={panelOpen ? 'map-page' : 'map-page map-page--collapsed'}>
      {panelOpen ? (
        <FilterPanel
          options={options}
          filters={filters}
          onFiltersChange={setFilters}
          includeDecommissioned={includeDecommissioned}
          onIncludeDecommissionedChange={setIncludeDecommissioned}
          onClear={clearAll}
          markers={markers}
          selectedId={selectedId}
          onSelectSite={selectSite}
          onCollapse={() => setPanelVisibility(false)}
        />
      ) : (
        <div className="map-rail">
          <button id="show-map-panel" type="button" className="map-rail__button" aria-expanded="false" aria-controls="map-panel" title="Show filters and sites" onClick={() => setPanelVisibility(true)}>
            <MapIcon name="chevronRight" />
            <span className="map-rail__label">Filters</span>
            <span className="visually-hidden">Show filters and sites</span>
          </button>
        </div>
      )}

      <div className={card ? 'map-stage map-stage--selected' : 'map-stage'} role="region" aria-label="Site map" ref={stage}>
        <SiteMap markers={markers} selectedId={selectedId} onSelect={selectSite} onMapReady={onMapReady} />
        {slowUpdate && <div className="map-progress" role="status"><span className="visually-hidden">Updating the map…</span></div>}

        <dl className="map-overlay map-headline" aria-label="Totals for the current view">
          <div><dt>sites</dt><dd>{formatNumber(markers.length)}</dd></div>
          <div><dt>machines in service</dt><dd>{formatNumber(machines)}</dd></div>
          <div><dt>{countries === 1 ? 'country' : 'countries'}</dt><dd>{formatNumber(countries)}</dd></div>
        </dl>

        <div className="map-overlay map-controls" role="group" aria-label="Map view">
          <button type="button" className="map-control" title="Zoom in" onClick={() => map?.zoomIn()}><MapIcon name="plus" /><span className="visually-hidden">Zoom in</span></button>
          <button type="button" className="map-control" title="Zoom out" onClick={() => map?.zoomOut()}><MapIcon name="minus" /><span className="visually-hidden">Zoom out</span></button>
          <button type="button" className="map-control" title="Show all sites" onClick={() => map && fitToMarkers(map, markers)}><MapIcon name="globe" /><span className="visually-hidden">Show all sites</span></button>
          {document.fullscreenEnabled && (
            <button type="button" className="map-control" title={fullscreen ? 'Exit full screen' : 'Full screen'} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} aria-pressed={fullscreen} onClick={toggleFullscreen}>
              <MapIcon name={fullscreen ? 'exitFullscreen' : 'fullscreen'} />
            </button>
          )}
        </div>

        {card && (
          <div className="map-overlay map-card-slot">
            <SiteCard
              marker={card}
              year={year}
              includeDecommissioned={includeDecommissioned}
              onClose={closeCard}
              onZoom={() => flyTo(card.latitude, card.longitude, 8)}
            />
          </div>
        )}

        {card && (
          <button
            type="button"
            className="map-overlay map-legend-toggle"
            aria-expanded={legendOpen}
            aria-controls="map-legend"
            onClick={() => setLegendOpen((open) => !open)}
          >
            {legendOpen ? 'Hide legend' : 'Show legend'}
          </button>
        )}

        <section
          id="map-legend"
          className={`map-overlay map-legend${card && legendOpen ? ' map-legend--mobile-open' : ''}${card && !legendOpen ? ' map-legend--mobile-collapsed' : ''}`}
          aria-labelledby="map-legend-status"
        >
          <h2 id="map-legend-status">Most advanced status</h2>
          <ul>
            {LEGEND_STATUSES.map(([status, label]) => (
              <li key={status}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle className={`site-marker site-marker--${status}`} cx="7" cy="7" r="5" /></svg>
                {label}
              </li>
            ))}
          </ul>
          <h2>Machines in service</h2>
          <ul className="map-legend__sizes">
            {LEGEND_SIZES.map((size) => {
              const radius = markerRadius(size)
              return (
                <li key={size}>
                  <svg width={radius * 2 + 2} height={radius * 2 + 2} aria-hidden="true"><circle className="map-legend__size" cx={radius + 1} cy={radius + 1} r={radius} /></svg>
                  {size}
                </li>
              )
            })}
          </ul>
        </section>

        <div className="map-overlay map-year">
          <div className="map-year__label">
            <label htmlFor="map-year">Deployments in service at the end of</label>
            <output htmlFor="map-year">{yearInput}</output>
          </div>
          <input id="map-year" type="range" min={firstYear} max={currentYear} step={1} value={yearInput} onChange={(event) => setYearInput(Number(event.target.value))} />
          <div className="map-year__ends" aria-hidden="true"><span>{firstYear}</span><span>{currentYear}</span></div>
          {data.excludedCount > 0 && (
            <p className="map-year__note">{formatNumber(data.excludedCount)} {data.excludedCount === 1 ? 'deployment has' : 'deployments have'} no commissioning year and {data.excludedCount === 1 ? 'is' : 'are'} not on the map.</p>
          )}
        </div>

        {data.initialLoad && <p className="map-overlay map-message" role="status">Loading the map…</p>}
        {data.error && (
          <div className="map-overlay map-message" role="alert">
            <p>The map could not load: {data.error}</p>
            <button type="button" className="button button--primary" onClick={data.retry}>Try again</button>
          </div>
        )}
        {!data.initialLoad && !data.error && !data.updating && markers.length === 0 && (
          <div className="map-overlay map-message" role="status">
            <p><strong>No sites match these filters</strong> for the end of {year}.</p>
            <button type="button" className="button button--secondary" onClick={clearAll}>Clear all filters</button>
          </div>
        )}
      </div>
    </section>
  )
}

export default MapPage
