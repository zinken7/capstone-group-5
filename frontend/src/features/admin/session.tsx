import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  /** Signing out on purpose: administration pages wait instead of asking for a new sign-in */
  | { status: 'signing-out' }
  | { status: 'error' }

interface AdminSessionValue {
  state: SessionState
  load: () => void
  setProfile: (profile: AdminProfile | null) => void
  /** Resolves to whether the server ended the session; on failure the administrator stays signed in */
  signOut: () => Promise<boolean>
  /** Set when the last sign-out did not reach the server */
  signOutFailed: boolean
  /** Turns an API error into a message, and reacts to an ended session or a pending password change. */
  handleError: (error: unknown) => string
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null)

/** Set while this browser has an administrator signed in, so public pages check the session only then, not for every visitor */
const SIGNED_IN_KEY = 'mining-market-map.admin-signed-in'
/** The public page this tab was on before it went into administration, to return to on signing out */
const RETURN_TO_KEY = 'mining-market-map.admin-return-to'

/** Whether an administrator was signed in here when last known; storage that cannot be read counts as no */
export function mayBeSignedIn(): boolean {
  try {
    return window.localStorage.getItem(SIGNED_IN_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberPublicPage(path: string) {
  try {
    window.sessionStorage.setItem(RETURN_TO_KEY, path)
  } catch {
    // Without storage, signing out returns to the map
  }
}

/** Where signing out from administration goes: the public page this tab came from, or the map */
export function publicPageToReturnTo(): string {
  try {
    const path = window.sessionStorage.getItem(RETURN_TO_KEY)
    // Only a path on this site, never another origin
    return path?.startsWith('/') && !path.startsWith('//') ? path : '/map'
  } catch {
    return '/map'
  }
}

export function AdminSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ status: 'unknown' })

  useEffect(() => {
    try {
      if (state.status === 'signed-in') window.localStorage.setItem(SIGNED_IN_KEY, '1')
      if (state.status === 'signed-out') window.localStorage.removeItem(SIGNED_IN_KEY)
    } catch {
      // Without storage, public pages do not show the session until a correction checks it
    }
  }, [state.status])

  const load = useCallback(() => {
    getSession()
      .then((profile) => setState(profile ? { status: 'signed-in', profile } : { status: 'signed-out' }))
      .catch(() => setState({ status: 'error' }))
  }, [])

  const setProfile = useCallback((profile: AdminProfile | null) => {
    setState(profile ? { status: 'signed-in', profile } : { status: 'signed-out' })
  }, [])

  const [signOutFailed, setSignOutFailed] = useState(false)
  // The session to go back to if signing out fails
  const lastSignedIn = useRef<SessionState | null>(null)
  useEffect(() => {
    if (state.status === 'signed-in') lastSignedIn.current = state
  }, [state])

  const signOut = useCallback(async () => {
    setSignOutFailed(false)
    setState({ status: 'signing-out' })
    try {
      await apiSignOut()
      setState({ status: 'signed-out' })
      return true
    } catch {
      // The cookie may still work, so showing the administrator as signed out would be wrong on a shared computer
      setState(lastSignedIn.current ?? { status: 'unknown' })
      setSignOutFailed(true)
      return false
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

  const value = useMemo(() => ({ state, load, setProfile, signOut, signOutFailed, handleError }), [state, load, setProfile, signOut, signOutFailed, handleError])
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
  if (state.status === 'signing-out') {
    // The sign-out control has already sent this tab back to the public site
    return <StateMessage variant="loading" title="Signing out" message="One moment." />
  }
  if (state.status === 'signed-out') {
    return <Navigate replace to="/admin/login" state={{ from: location.pathname }} />
  }
  if (state.profile.mustChangePassword && !allowPendingPasswordChange) {
    return <Navigate replace to="/admin/password" />
  }
  return children
}
