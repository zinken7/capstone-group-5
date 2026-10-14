import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getSession, signOut as apiSignOut } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/errors'
import StateMessage from '../../shared/components/StateMessage'
import type { AdminProfile } from './types'

type SessionState =
  | { status: 'unknown' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; profile: AdminProfile }
  | { status: 'error' }

interface AdminSessionValue {
  state: SessionState
  load: () => void
  setProfile: (profile: AdminProfile | null) => void
  signOut: () => Promise<void>
  /** Turns an API error into a message, and reacts to an ended session or a pending password change. */
  handleError: (error: unknown) => string
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null)

export function AdminSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ status: 'unknown' })

  const load = useCallback(() => {
    getSession()
      .then((profile) => setState(profile ? { status: 'signed-in', profile } : { status: 'signed-out' }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  const setProfile = useCallback((profile: AdminProfile | null) => {
    setState(profile ? { status: 'signed-in', profile } : { status: 'signed-out' })
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiSignOut()
    } finally {
      setState({ status: 'signed-out' })
    }
  }, [])

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setState({ status: 'signed-out' })
      return 'Your session has ended. Sign in again.'
    }
    if (error instanceof ApiError && error.status === 403 && error.message === 'password change required') {
      setState((current) => current.status === 'signed-in'
        ? { status: 'signed-in', profile: { ...current.profile, mustChangePassword: true } }
        : current)
      return 'Change your temporary password to continue.'
    }
    return error instanceof Error ? error.message : 'Something went wrong.'
  }, [])

  const value = useMemo(() => ({ state, load, setProfile, signOut, handleError }), [state, load, setProfile, signOut, handleError])
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext)
  if (!value) throw new Error('useAdminSession must be used inside AdminSessionProvider')
  return value
}

/** The session on a public page, which may also render without the provider; null then. */
export function useOptionalAdminSession(): AdminSessionValue | null {
  return useContext(AdminSessionContext)
}

interface RequireAdminSessionProps {
  children: ReactNode
  allowPendingPasswordChange?: boolean
}

/**
 * Shows its children only to a signed-in administrator. Others go to the
 * sign-in page; an administrator with a temporary password goes to the
 * password page. The backend enforces the same rules on every request.
 */
export function RequireAdminSession({ children, allowPendingPasswordChange = false }: RequireAdminSessionProps) {
  const { state, load } = useAdminSession()
  const location = useLocation()

  useEffect(() => {
    if (state.status === 'unknown') load()
  }, [state.status, load])

  if (state.status === 'unknown') {
    return <StateMessage variant="loading" title="Checking your session" message="One moment." />
  }
  if (state.status === 'error') {
    return <StateMessage variant="error" title="Administration unavailable" message="The administrator session could not be checked. Try again later." />
  }
  if (state.status === 'signed-out') {
    return <Navigate replace to="/admin/login" state={{ from: location.pathname }} />
  }
  if (state.profile.mustChangePassword && !allowPendingPasswordChange) {
    return <Navigate replace to="/admin/password" />
  }
  return children
}
