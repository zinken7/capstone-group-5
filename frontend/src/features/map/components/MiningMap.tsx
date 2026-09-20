import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
} from 'react-leaflet'
import { Fragment } from 'react'
import 'leaflet/dist/leaflet.css'
import '../map.css'
import type { MapSite } from '../types'

interface MiningMapProps {
  sites: MapSite[]
  showDensity?: boolean
}

const AUSTRALIA_CENTRE: [number, number] = [-25.2744, 133.7751]

const DENSITY_COLOURS = {
  low: '#356ca5',
  medium: '#b4a35a',
  high: '#f1d44d',
} as const

function getSiteQuantity(site: MapSite): number {
  return site.deployments.reduce((total, deployment) => total + deployment.quantity, 0)
}

function getDensityColour(quantity: number): string {
  if (quantity <= 10) return DENSITY_COLOURS.low
  if (quantity <= 50) return DENSITY_COLOURS.medium
  return DENSITY_COLOURS.high
}

function getDensityRadius(quantity: number, maximumQuantity: number): number {
  return 18 + Math.sqrt(quantity / maximumQuantity) * 34
}

function MiningMap({ sites, showDensity = false }: MiningMapProps) {
  const quantities = sites.map(getSiteQuantity)
  const maximumQuantity = Math.max(...quantities, 1)

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

        {sites.map((site, index) => {
          const quantity = quantities[index] ?? 0
          const densityColour = getDensityColour(quantity)

          return (
            <Fragment key={site.id}>
              {showDensity && (
                <CircleMarker
                  center={[site.latitude, site.longitude]}
                  radius={getDensityRadius(quantity, maximumQuantity)}
                  interactive={false}
                  pathOptions={{
                    color: densityColour,
                    fillColor: densityColour,
                    fillOpacity: 0.2,
                    opacity: 0.5,
                    weight: 1,
                  }}
                />
              )}
              <CircleMarker
                center={[site.latitude, site.longitude]}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#173f63',
                  fillOpacity: 0.95,
                  weight: 3,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.96}>
                  <span className="site-tooltip">
                    <strong>{site.name}</strong>
                    <small>{quantity} verified machines</small>
                  </span>
                </Tooltip>
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
            </Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default MiningMap
