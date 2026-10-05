import { useEffect, useState } from 'react'
import { getRegister } from '../lib/api/register'
import type { EquipmentRecord } from '../features/equipment/types'

interface RegisterState {
  records: EquipmentRecord[]
  loading: boolean
  error: string | null
}

export function useLiveRegister(enabled = true): RegisterState {
  const [state, setState] = useState<RegisterState>({ records: [], loading: enabled, error: null })

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    getRegister()
      .then((records) => {
        if (!cancelled) setState({ records, loading: false, error: null })
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState({
            records: [],
            loading: false,
            error: cause instanceof Error ? cause.message : 'Unable to load live records',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
