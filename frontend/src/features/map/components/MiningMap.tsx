import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../map.css'
import type { DeploymentStatus, MapDeployment, MapSite } from '../types'

interface MiningMapProps {
  sites: MapSite[]
}

const AUSTRALIA_CENTRE: [number, number] = [-25.2744, 133.7751]

const STATUS_PRIORITY: DeploymentStatus[] = [
  'operational',
  'commissioning',
  'announced',
  'decommissioned',
]

const STATUS_COLOURS: Record<DeploymentStatus, string> = {
  operational: '#15803d',
  commissioning: '#d97706',
  announced: '#2563eb',
  decommissioned: '#64748b',
}

function getMarkerStatus(deployments: MapDeployment[]): DeploymentStatus {
  return (
    STATUS_PRIORITY.find((status) =>
      deployments.some((deployment) => deployment.status === status),
    ) ?? 'decommissioned'
  )
}

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

        {sites.map((site) => {
          const markerStatus = getMarkerStatus(site.deployments)
          const markerColour = STATUS_COLOURS[markerStatus]

          return (
            <CircleMarker
              key={site.id}
              center={[site.latitude, site.longitude]}
              radius={9}
              pathOptions={{
                color: markerColour,
                fillColor: markerColour,
                fillOpacity: 0.75,
              }}
            >
              <Popup>
                <article className="site-popup">
                  <h2>{site.name}</h2>
                  <p className="site-location">
                    {site.region}, {site.country}
                  </p>

                  {site.deployments.map((deployment) => (
                    <section
                      className="deployment-detail"
                      key={deployment.id}
                    >
                      <h3>
                        {deployment.machineModel ?? deployment.machineType}
                      </h3>
                      <dl>
                        <div>
                          <dt>Supplier</dt>
                          <dd>{deployment.supplier}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{deployment.status}</dd>
                        </div>
                        <div>
                          <dt>Quantity</dt>
                          <dd>{deployment.quantity}</dd>
                        </div>
                      </dl>
                    </section>
                  ))}
                </article>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default MiningMap