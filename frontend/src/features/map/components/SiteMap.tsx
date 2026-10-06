import type { FeatureCollection } from 'geojson'
import type { Map as LeafletMap } from 'leaflet'
import { useEffect, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import type { MapMarker } from '../../../lib/api/types'
import { formatNumber } from '../../../lib/format'
import { BASEMAP_ATTRIBUTION, loadCountries } from '../basemap'
import { boundsOf, markerRadius } from '../geometry'

/** Fits the map to the markers, leaving room for the headline and the year control; skipped while the map has no size. */
export function fitToMarkers(map: LeafletMap, markers: readonly MapMarker[]): void {
  const bounds = boundsOf(markers)
  const size = map.getSize()
  if (!bounds || size.x === 0 || size.y === 0) return
  map.fitBounds(bounds, { paddingTopLeft: [48, 96], paddingBottomRight: [48, 160], maxZoom: 6 })
}

function MapEffects({ markers, fitKey, onMapReady }: { markers: readonly MapMarker[]; fitKey: string; onMapReady: (map: LeafletMap) => void }) {
  const map = useMap()

  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])

  // Refit only when the set of sites changes, not on every re-render
  useEffect(() => {
    fitToMarkers(map, markers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey])

  return null
}

interface SiteMapProps {
  markers: readonly MapMarker[]
  selectedId: number | null
  onSelect: (id: number) => void
  onMapReady: (map: LeafletMap) => void
}

function SiteMap({ markers, selectedId, onSelect, onMapReady }: SiteMapProps) {
  const [countries, setCountries] = useState<FeatureCollection | null>(null)
  const selected = markers.find((marker) => marker.id === selectedId)
  // Larger sites first, so smaller markers stay clickable on top of them
  const drawOrder = [...markers].sort((a, b) => b.machineCount - a.machineCount)
  const fitKey = markers.map((marker) => marker.id).sort((a, b) => a - b).join(',')

  useEffect(() => {
    let active = true
    loadCountries()
      .then((collection) => {
        if (active) setCountries(collection)
      })
      // Without the outlines the markers still work on the plain background
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  return (
    <MapContainer
      className="site-map"
      center={[20, 10]}
      zoom={2}
      minZoom={2}
      maxZoom={10}
      maxBounds={[[-85, -240], [85, 240]]}
      zoomControl={false}
      worldCopyJump={false}
      aria-label="Map of mine sites"
    >
      {countries && (
        <GeoJSON data={countries} interactive={false} style={{ className: 'basemap-country' }} attribution={BASEMAP_ATTRIBUTION} />
      )}
      {drawOrder.map((marker) => (
        <CircleMarker
          // The status class is fixed when Leaflet creates the path, so a new status needs a new marker
          key={`${marker.id}-${marker.status}`}
          center={[marker.latitude, marker.longitude]}
          radius={markerRadius(marker.machineCount)}
          pathOptions={{ className: `site-marker site-marker--${marker.status}` }}
          bubblingMouseEvents={false}
          eventHandlers={{ click: () => onSelect(marker.id) }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <strong>{marker.name}</strong> · {formatNumber(marker.machineCount)} machines
          </Tooltip>
        </CircleMarker>
      ))}
      {selected && (
        <CircleMarker
          key={`selected-${selected.id}`}
          center={[selected.latitude, selected.longitude]}
          radius={markerRadius(selected.machineCount) + 5}
          interactive={false}
          pathOptions={{ className: 'site-marker-ring' }}
        />
      )}
      <MapEffects markers={markers} fitKey={fitKey} onMapReady={onMapReady} />
    </MapContainer>
  )
}

export default SiteMap
