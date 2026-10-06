export interface TreemapTile<T> {
  item: T
  /** Position and size as percentages of the container */
  left: number
  top: number
  width: number
  height: number
}

// The layout box; tiles are returned as percentages, so only its proportions matter
const BOX_WIDTH = 160
const BOX_HEIGHT = 100

function worstRatio(areas: number[], side: number): number {
  const sum = areas.reduce((total, area) => total + area, 0)
  const max = Math.max(...areas)
  const min = Math.min(...areas)
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
}

/**
 * Squarified treemap layout (Bruls, Huizing and van Wijk): items largest first, laid out in strips
 * along the shorter side so tiles stay close to square.
 */
export function squarify<T>(items: T[], value: (item: T) => number): TreemapTile<T>[] {
  const entries = items.map((item) => ({ item, value: value(item) })).filter((entry) => entry.value > 0).sort((a, b) => b.value - a.value)
  const total = entries.reduce((sum, entry) => sum + entry.value, 0)
  if (total === 0) return []
  const scale = (BOX_WIDTH * BOX_HEIGHT) / total
  const areas = entries.map((entry) => entry.value * scale)
  const tiles: TreemapTile<T>[] = []
  let x = 0
  let y = 0
  let width = BOX_WIDTH
  let height = BOX_HEIGHT
  let row: number[] = []

  const layoutRow = (indices: number[]) => {
    const sum = indices.reduce((total, index) => total + areas[index], 0)
    if (width >= height) {
      const stripWidth = sum / height
      let cursor = y
      for (const index of indices) {
        const tileHeight = areas[index] / stripWidth
        tiles.push({ item: entries[index].item, left: x, top: cursor, width: stripWidth, height: tileHeight })
        cursor += tileHeight
      }
      x += stripWidth
      width -= stripWidth
    } else {
      const stripHeight = sum / width
      let cursor = x
      for (const index of indices) {
        const tileWidth = areas[index] / stripHeight
        tiles.push({ item: entries[index].item, left: cursor, top: y, width: tileWidth, height: stripHeight })
        cursor += tileWidth
      }
      y += stripHeight
      height -= stripHeight
    }
  }

  let index = 0
  while (index < areas.length) {
    const side = Math.min(width, height)
    const candidate = [...row, index]
    if (row.length === 0 || worstRatio(candidate.map((i) => areas[i]), side) <= worstRatio(row.map((i) => areas[i]), side)) {
      row = candidate
      index += 1
    } else {
      layoutRow(row)
      row = []
    }
  }
  if (row.length > 0) layoutRow(row)

  return tiles.map((tile) => ({
    item: tile.item,
    left: (tile.left / BOX_WIDTH) * 100,
    top: (tile.top / BOX_HEIGHT) * 100,
    width: (tile.width / BOX_WIDTH) * 100,
    height: (tile.height / BOX_HEIGHT) * 100,
  }))
}
