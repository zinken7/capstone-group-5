import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../map.css'
import type { MapSite } from '../types'

interface MiningMapProps {
  sites: MapSite[]
}

const AUSTRALIA_CENTRE: [number, number] = [-25.2744, 133.7751]

function MiningMap({ sites }: MiningMapProps) {
  return (
    <div
      className="mining-map-region"
      role="region"
      aria-label="Autonomous mining equipment site map"
    >
      <MapContainer
        center={AUSTRALIA_CENTRE}
        zoom={4}
        scrollWheelZoom
        keyboard
        className="mining-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.latitude, site.longitude]}
            radius={8}
          >
            <Popup>
              <strong>{site.name}</strong>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

export default MiningMap