import { useEffect, useState } from 'react'
import { getLiveSites } from '../lib/api/live'
import type { MapQuery } from '../lib/api/types'
import type { MapSite } from '../features/map/types'

interface LiveSitesInternalState {
  sites: MapSite[]
  excludedCount: number
  loading: boolean
  error: string | null
  requestKey: string
}

export function useLiveSites(query: MapQuery = {}): Omit<LiveSitesInternalState, 'requestKey'> {
  const queryKey = JSON.stringify(query)
  const [state, setState] = useState<LiveSitesInternalState>({
    sites: [],
    excludedCount: 0,
    loading: true,
    error: null,
    requestKey: '',
  })

  useEffect(() => {
    let cancelled = false
    const nextQuery = JSON.parse(queryKey) as MapQuery

    getLiveSites(nextQuery)
      .then((result) => {
        if (!cancelled) {
          setState({ ...result, loading: false, error: null, requestKey: queryKey })
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState({
            sites: [],
            excludedCount: 0,
            loading: false,
            error: cause instanceof Error ? cause.message : 'Unable to load live data',
            requestKey: queryKey,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [queryKey])

  const currentRequest = state.requestKey === queryKey
  return {
    sites: currentRequest ? state.sites : [],
    excludedCount: currentRequest ? state.excludedCount : 0,
    loading: !currentRequest || state.loading,
    error: currentRequest ? state.error : null,
  }
}
