import { useMemo, useState } from 'react'
import MiningMap from '../components/MiningMap'
import StateMessage from '../../../shared/components/StateMessage'
import { useLiveSites } from '../../../hooks/useLiveSites'
import type { MapSite } from '../types'
import { formatAustralianDateInput, parseAustralianDate } from '../date'

const MACHINE_TYPES = [
  ['haul_truck', 'Haul truck'],
  ['lhd', 'LHD'],
  ['loader', 'Loader'],
  ['dozer', 'Dozer'],
  ['excavator', 'Excavator'],
  ['drill', 'Drill'],
]

interface MapPageProps {
  /** Test/demo override; normal application runtime always uses the live API. */
  sites?: MapSite[]
}

function MapPage({ sites: suppliedSites }: MapPageProps = {}) {
  const [supplier, setSupplier] = useState('')
  const [machineType, setMachineType] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [showDecommissioned, setShowDecommissioned] = useState(false)
  const [showDensity, setShowDensity] = useState(true)
  const date = parseAustralianDate(dateInput)
  const { sites: liveSites, excludedCount: liveExcludedCount, loading: liveLoading, error: liveError } = useLiveSites({
    supplier: supplier || undefined,
    machineType: machineType || undefined,
    date,
  })

  const sites = suppliedSites ?? liveSites
  const loading = suppliedSites === undefined && liveLoading
  const error = suppliedSites === undefined ? liveError : null
  const excludedCount = suppliedSites === undefined ? liveExcludedCount : 0
  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sites.flatMap((site) =>
            site.deployments
              .filter((deployment) =>
                date !== undefined ||
                deployment.status === 'operational' ||
                (showDecommissioned && deployment.status === 'decommissioned'),
              )
              .map((deployment) => deployment.supplier),
          ),
        ),
      ).sort(),
    [date, showDecommissioned, sites],
  )

  const visibleSites = sites
    .map((site) => ({
      ...site,
      deployments: site.deployments.filter((deployment) =>
        (
          date !== undefined ||
          deployment.status === 'operational' ||
          (showDecommissioned && deployment.status === 'decommissioned')
        ) &&
        (!supplier || deployment.supplier === supplier) &&
        (!machineType || deployment.machineType.toLowerCase().replaceAll(' ', '_') === machineType),
      ),
    }))
    .filter((site) => site.deployments.length > 0)

  return (
    <section className="map-page">
      <header>
        <p className="eyebrow">Interactive GIS map</p>
        <h1>Autonomous Mining Equipment Market Map</h1>
        <p className="intro">
          Explore autonomous mining deployments. The locations shown here are
          verified records loaded from the project API.
        </p>
      </header>

      <div className="map-toolbar">
        <label htmlFor="supplier-filter">Technology supplier</label>
        <select
          id="supplier-filter"
          value={supplier}
          onChange={(event) => setSupplier(event.target.value)}
        >
          <option value="">All suppliers</option>
          {supplierOptions.map((supplier) => (
            <option key={supplier} value={supplier}>{supplier}</option>
          ))}
        </select>

        <label htmlFor="machine-type-filter">Machine type</label>
        <select id="machine-type-filter" value={machineType} onChange={(event) => setMachineType(event.target.value)}>
          <option value="">All machine types</option>
          {MACHINE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>

        <label htmlFor="date-filter">Show records active on (DD/MM/YYYY)</label>
        <input
          id="date-filter"
          className="date-filter-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          maxLength={10}
          value={dateInput}
          aria-invalid={dateInput.length === 10 && date === undefined}
          onChange={(event) => setDateInput(formatAustralianDateInput(event.target.value))}
        />

        <label className="map-checkbox">
          <input
            type="checkbox"
            checked={showDecommissioned}
            onChange={(event) => setShowDecommissioned(event.target.checked)}
          />
          Show decommissioned records
        </label>

        <label className="map-checkbox">
          <input
            type="checkbox"
            checked={showDensity}
            onChange={(event) => setShowDensity(event.target.checked)}
          />
          Show machine quantity density
        </label>

        <p className="filter-result" aria-live="polite">
          {visibleSites.length} {visibleSites.length === 1 ? 'site' : 'sites'} shown
        </p>
      </div>

      {excludedCount > 0 && date && (
        <p className="filter-note" role="status">
          {excludedCount} record{excludedCount === 1 ? '' : 's'} without a commissioning date were excluded from the timeline.
        </p>
      )}

      {date && !showDecommissioned && (
        <p className="filter-note" role="status">
          Date view includes deployments active on the selected date, including records now marked non-operational.
        </p>
      )}

      {showDensity && (
        <section className="density-guide" aria-label="Machine quantity density guide">
          <strong>Machine quantity density</strong>
          <p>Larger, more prominent halos indicate more verified machines at a site. Colour and size show quantity bands, not operating status.</p>
          <ul>
            <li><span className="density-swatch density-swatch--low" />1–10 machines</li>
            <li><span className="density-swatch density-swatch--medium" />11–50 machines</li>
            <li><span className="density-swatch density-swatch--high" />51+ machines</li>
          </ul>
        </section>
      )}

      {loading && <StateMessage variant="loading" title="Loading live records" message="Connecting to the backend API…" />}
      {error && <StateMessage variant="error" title="Unable to load the map" message={`${error}. Check that the backend is running and try again.`} />}
      {!loading && !error && visibleSites.length === 0 && (
        <StateMessage
          title="No matching sites"
          message="Try a different supplier name or clear the filter."
        />
      )}

      {!loading && !error && visibleSites.length > 0 && (
        <>
          <MiningMap sites={visibleSites} showDensity={showDensity} />
          <section className="site-summary" aria-labelledby="visible-locations-heading">
            <h2 id="visible-locations-heading">Visible locations</h2>
            <ul>
              {visibleSites.map((site) => {
                const quantity = site.deployments.reduce((total, deployment) => total + deployment.quantity, 0)
                return (
                  <li key={site.id}>
                    <strong>{site.name}</strong>
                    <span>{quantity} verified machines · {site.region}, {site.country}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </section>
  )
}

export default MapPage
