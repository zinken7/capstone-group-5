import { describe, expect, it } from 'vitest'

import { squarify } from './treemap'

describe('squarify', () => {
  it('fills the box with tiles whose areas follow the values', () => {
    const values = [60, 20, 10, 6, 4]
    const tiles = squarify(values, (value) => value)

    expect(tiles.map((tile) => tile.item)).toEqual(values)
    const area = (tile: { width: number; height: number }) => (tile.width * tile.height) / 10000
    expect(tiles.reduce((total, tile) => total + area(tile), 0)).toBeCloseTo(1)
    for (const tile of tiles) {
      expect(area(tile)).toBeCloseTo(tile.item / 100)
      expect(tile.left).toBeGreaterThanOrEqual(0)
      expect(tile.top).toBeGreaterThanOrEqual(0)
      expect(tile.left + tile.width).toBeLessThanOrEqual(100.0001)
      expect(tile.top + tile.height).toBeLessThanOrEqual(100.0001)
    }
  })

  it('leaves out empty values and returns nothing when every value is zero', () => {
    expect(squarify([5, 0], (value) => value)).toHaveLength(1)
    expect(squarify([0, 0], (value) => value)).toEqual([])
  })
})
