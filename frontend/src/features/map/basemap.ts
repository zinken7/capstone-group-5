import type { Feature, FeatureCollection, Geometry, Position } from 'geojson'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

// No mine sites there, and its outline wraps the whole globe
const ANTARCTICA = '010'

/**
 * Keeps a ring continuous where it crosses the antimeridian (Russia, Fiji):
 * Leaflet would otherwise draw a band across the whole map between ±180°.
 */
export function unwrapRing(ring: readonly Position[]): Position[] {
  const unwrapped: Position[] = []
  let offset = 0
  for (const [longitude, latitude] of ring) {
    const previous = unwrapped[unwrapped.length - 1]
    if (previous) {
      const step = longitude + offset - previous[0]
      if (step > 180) offset -= 360
      else if (step < -180) offset += 360
    }
    unwrapped.push([longitude + offset, latitude])
  }
  return unwrapped
}

function unwrapGeometry(geometry: Geometry): Geometry {
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: geometry.coordinates.map(unwrapRing) }
  if (geometry.type === 'MultiPolygon') return { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map(unwrapRing)) }
  return geometry
}

/**
 * Natural Earth country outlines at 1:110m (public domain), from world-atlas.
 * Loaded on demand so the map page's own code arrives first.
 */
export async function loadCountries(): Promise<FeatureCollection> {
  const { default: topology } = await import('world-atlas/countries-110m.json')
  const world = topology as unknown as Topology<{ countries: GeometryCollection }>
  const countries = feature(world, world.objects.countries)
  return {
    ...countries,
    features: countries.features
      .filter((country: Feature) => country.id !== ANTARCTICA)
      .map((country: Feature) => ({ ...country, geometry: unwrapGeometry(country.geometry) })),
  }
}

export const BASEMAP_ATTRIBUTION = 'Base map: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain)'
