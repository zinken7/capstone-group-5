import { useEffect, useState } from 'react'

import { getTimeline } from '../../lib/api/analytics'
import { getMap } from '../../lib/api/map'
import { getContributionReferenceData } from '../../lib/api/reference-data'
import type { MapMarker, MapQuery, MapResult } from '../../lib/api/types'
import { formatCountry } from '../../lib/format'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../contribute/types'
import type { ReferenceOption } from '../contribute/types'

export interface MapOptions {
  machineTypes: readonly ReferenceOption[]
  automationLevels: readonly ReferenceOption[]
  environments: readonly ReferenceOption[]
  suppliers: string[]
  countries: ReferenceOption[]
  /** Region names with the country each belongs to, so the list can follow the country filter */
  regions: { name: string; countryCode: string }[]
  commodities: string[]
  /** Earliest commissioning year in the data, for the year control */
  firstYear: number | null
}

const sortedUnique = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort()

/**
 * Filter options: controlled values from the reference data, and suppliers,
 * countries, regions and commodities from every verified site, so an option
 * never disappears because of another filter.
 */
export function useMapOptions(): MapOptions | null {
  const [options, setOptions] = useState<MapOptions | null>(null)

  useEffect(() => {
    let active = true
    void Promise.allSettled([getContributionReferenceData(), getMap(), getTimeline()]).then(([reference, map, timeline]) => {
      if (!active) return
      const references = reference.status === 'fulfilled' ? reference.value : DEFAULT_CONTRIBUTION_REFERENCE_DATA
      const markers = map.status === 'fulfilled' ? map.value.markers : []
      const regions = new Map<string, string>()
      for (const marker of markers) if (marker.region) regions.set(`${marker.countryCode}:${marker.region}`, marker.countryCode)
      setOptions({
        machineTypes: references.machineTypes,
        automationLevels: references.automationLevels,
        environments: references.environments,
        suppliers: sortedUnique(markers.flatMap((marker) => marker.technologySuppliers)),
        countries: sortedUnique(markers.map((marker) => marker.countryCode))
          .map((code): ReferenceOption => [code, formatCountry(code)])
          .sort((a, b) => a[1].localeCompare(b[1])),
        regions: [...regions.entries()]
          .map(([key, countryCode]) => ({ name: key.slice(countryCode.length + 1), countryCode }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        commodities: sortedUnique(markers.map((marker) => marker.commodity)),
        firstYear: timeline.status === 'fulfilled' && timeline.value.length > 0 ? timeline.value[0].year : null,
      })
    })
    return () => {
      active = false
    }
  }, [])

  return options
}

export interface MapData {
  markers: MapMarker[]
  excludedCount: number
  /** True until the first response arrives */
  initialLoad: boolean
  /** True while a request is in flight; the previous markers stay on screen meanwhile */
  updating: boolean
  error: string | null
  retry: () => void
}

/** The filtered map. A new query keeps the previous markers until its response arrives, so the map never blanks. */
export function useMapData(query: MapQuery): MapData {
  const [settled, setSettled] = useState<{ key: string; result: MapResult | null; error: string | null } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify(query)
  const requestKey = `${key}#${attempt}`

  useEffect(() => {
    let active = true
    getMap(JSON.parse(key) as MapQuery)
      .then((result) => {
        if (active) setSettled({ key: requestKey, result, error: null })
      })
      .catch((caught: unknown) => {
        const error = caught instanceof Error ? caught.message : 'The map could not be loaded.'
        // Keep the last markers on screen behind the error
        if (active) setSettled((previous) => ({ key: requestKey, result: previous?.result ?? null, error }))
      })
    return () => {
      active = false
    }
  }, [key, requestKey])

  const updating = settled?.key !== requestKey
  return {
    markers: settled?.result?.markers ?? [],
    excludedCount: settled?.result?.excludedCount ?? 0,
    initialLoad: settled === null,
    updating,
    error: updating ? null : settled?.error ?? null,
    retry: () => setAttempt((value) => value + 1),
  }
}

/**
 * True only once `value` has stayed true for `delay` ms, so a quick request
 * shows no loading state at all instead of a flash.
 */
export function useDelayedFlag(value: boolean, delay: number): boolean {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShown(value), value ? delay : 0)
    return () => clearTimeout(timer)
  }, [value, delay])

  return value && shown
}
