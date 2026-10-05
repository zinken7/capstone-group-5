import { describe, expect, it } from 'vitest'

import { loadCountries, unwrapRing } from './basemap'

describe('unwrapRing', () => {
  it('keeps a ring continuous across the antimeridian instead of jumping 360°', () => {
    expect(unwrapRing([[178, 65], [-179, 66], [-175, 64], [178, 65]])).toEqual([[178, 65], [181, 66], [185, 64], [178, 65]])
  })

  it('leaves an ordinary ring alone', () => {
    const ring = [[118, -22], [119, -23], [117, -24], [118, -22]]
    expect(unwrapRing(ring)).toEqual(ring)
  })
})

describe('loadCountries', () => {
  it('returns the Natural Earth countries without Antarctica and without bands across the map', async () => {
    const countries = await loadCountries()

    expect(countries.features.length).toBeGreaterThan(150)
    expect(countries.features.some((country) => country.id === '010')).toBe(false)
    for (const country of countries.features) {
      const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.type === 'MultiPolygon' ? country.geometry.coordinates : []
      for (const ring of polygons.flat()) {
        for (let index = 1; index < ring.length; index += 1) {
          expect(Math.abs(ring[index][0] - ring[index - 1][0]), String(country.id)).toBeLessThanOrEqual(180)
        }
      }
    }
  })
})
