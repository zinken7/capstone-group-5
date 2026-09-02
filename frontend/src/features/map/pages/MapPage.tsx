import MiningMap from '../components/MiningMap'
import type { MapSite } from '../types'

const DEMO_SITES: MapSite[] = [
  {
    id: 'pilbara-demo-site',
    name: 'Pilbara demonstration site',
    latitude: -22.3,
    longitude: 118.7,
  },
  {
    id: 'goldfields-demo-site',
    name: 'Goldfields demonstration site',
    latitude: -30.7,
    longitude: 121.5,
  },
]

function MapPage() {
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

      <MiningMap sites={DEMO_SITES} />
    </section>
  )
}

export default MapPage