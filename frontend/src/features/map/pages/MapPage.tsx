import { useMemo, useState } from 'react'
import MiningMap from '../components/MiningMap'
import StateMessage from '../../../shared/components/StateMessage'
import type { MapSite } from '../types'

interface MapPageProps {
  sites: MapSite[]
}

function MapPage({ sites }: MapPageProps) {
  const [supplierQuery, setSupplierQuery] = useState('')

  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sites.flatMap((site) =>
            site.deployments.map((deployment) => deployment.supplier),
          ),
        ),
      ).sort(),
    [sites],
  )

  const filteredSites = useMemo(() => {
    const query = supplierQuery.trim().toLowerCase()

    if (!query) {
      return sites
    }

    return sites
      .map((site) => ({
        ...site,
        deployments: site.deployments.filter((deployment) =>
          deployment.supplier.toLowerCase().includes(query),
        ),
      }))
      .filter((site) => site.deployments.length > 0)
  }, [sites, supplierQuery])

  return (
    <section className="map-page">
      <header>
        <p className="eyebrow">Interactive GIS map</p>
        <h1>Autonomous Mining Equipment Market Map</h1>
        <p className="intro">
          Explore autonomous mining deployments. The locations shown here are
          synthetic demonstration data and are not factual deployment claims.
        </p>
      </header>

      <div className="map-toolbar">
        <label htmlFor="supplier-filter">Filter by technology supplier</label>
        <input
          id="supplier-filter"
          type="search"
          list="supplier-options"
          value={supplierQuery}
          onChange={(event) => setSupplierQuery(event.target.value)}
          placeholder="Enter a supplier name"
        />
        <datalist id="supplier-options">
          {supplierOptions.map((supplier) => (
            <option key={supplier} value={supplier} />
          ))}
        </datalist>

        <p className="filter-result" aria-live="polite">
          {filteredSites.length}{' '}
          {filteredSites.length === 1 ? 'site' : 'sites'} shown
        </p>
      </div>

      {filteredSites.length === 0 && (
        <StateMessage
          title="No matching sites"
          message="Try a different supplier name or clear the filter."
        />
      )}

      <MiningMap sites={filteredSites} />
    </section>
  )
}

export default MapPage
