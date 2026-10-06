import { describe, expect, it } from 'vitest'

import { boundsOf, endedBy, fitPaddingForSize, inServiceAt, markerRadius, startYearOf } from './geometry'

const deployment = {
  status: 'operational' as const,
  commissioningYear: 2021,
  commissioningDate: '2021-03-15',
  validFrom: '2021-03-15',
  validTo: null,
}

describe('markerRadius', () => {
  it('grows with the square root of the machines, so area tracks quantity', () => {
    expect(markerRadius(100) / markerRadius(25)).toBeCloseTo(2)
  })

  it('never shrinks below a clickable size, including for a site with no machines in service', () => {
    expect(markerRadius(0)).toBe(5)
    expect(markerRadius(1)).toBe(5)
  })
})

describe('fitPaddingForSize', () => {
  it('keeps the desktop fit unchanged', () => {
    expect(fitPaddingForSize({ x: 1200, y: 700 })).toEqual({
      paddingTopLeft: [48, 96], paddingBottomRight: [48, 160],
    })
  })

  it('reserves proportional overlay space on a phone-sized map', () => {
    const padding = fitPaddingForSize({ x: 390, y: 544 })
    expect(padding.paddingTopLeft[0]).toBe(24)
    expect(padding.paddingBottomRight[1]).toBeGreaterThan(160)
  })
})

describe('boundsOf', () => {
  it('spans every marker', () => {
    expect(boundsOf([
      { latitude: -22.3, longitude: 118.7 },
      { latitude: 64.9, longitude: 20.4 },
      { latitude: -30.2, longitude: -71 },
    ])).toEqual([[-30.2, -71], [64.9, 118.7]])
  })

  it('is null without markers, so the map keeps its view', () => {
    expect(boundsOf([])).toBeNull()
  })
})

describe('inServiceAt', () => {
  it('counts a deployment from its commissioning year while it is still valid', () => {
    expect(inServiceAt(deployment, 2020)).toBe(false)
    expect(inServiceAt(deployment, 2021)).toBe(true)
    expect(inServiceAt(deployment, 2026)).toBe(true)
  })

  it('places a record known only by its year', () => {
    const yearOnly = { ...deployment, commissioningDate: null, validFrom: null, commissioningYear: 2023 }
    expect(startYearOf(yearOnly)).toBe(2023)
    expect(inServiceAt(yearOnly, 2023)).toBe(true)
  })

  it('leaves out announced and undated deployments', () => {
    expect(inServiceAt({ ...deployment, status: 'announced' }, 2026)).toBe(false)
    expect(inServiceAt({ ...deployment, commissioningYear: null, commissioningDate: null }, 2026)).toBe(false)
  })

  it('keeps a deployment that ends on the last day of the year, and drops it the year after', () => {
    const closed = { ...deployment, validTo: '2024-12-31' }
    expect(inServiceAt(closed, 2024)).toBe(true)
    expect(inServiceAt(closed, 2025)).toBe(false)
    expect(endedBy(closed, 2024)).toBe(false)
    expect(endedBy(closed, 2025)).toBe(true)
  })

  it('never counts an announced deployment as ended', () => {
    expect(endedBy({ ...deployment, status: 'announced', validTo: '2022-06-30' }, 2024)).toBe(false)
  })
})
