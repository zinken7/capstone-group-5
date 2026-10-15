import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { checkContributionStatuses, getOwnContribution } from '../../lib/api/contributions'
import type { ContributionStatus } from './types'

/** Where this browser keeps the submissions made from it (FR-59) */
export const STORAGE_KEY = 'mining-market-map.my-contributions.v1'
/** The status check takes this many submissions per request */
const BATCH_SIZE = 50
/** #track=<id>.<key>: the fragment never reaches the server, its logs or a Referer (FR-61) */
const TRACKING_FRAGMENT = /^#track=(\d+)\.([A-Za-z0-9_-]{43})$/

/** The private link that adds a submission to the list in another browser (FR-61) */
export function trackingLink(id: number, key: string): string {
  return `${window.location.origin}/contribute?tab=mine#track=${id}.${key}`
}

/** What happened to a tracking link opened in this browser */
export type LinkNotice = { kind: 'added' | 'already'; id: number } | { kind: 'invalid' }

/** A submission made from this browser, with the last status the site reported for it */
export interface TrackedContribution {
  id: number
  /** The submission's private key; it lets this browser read and update the submission */
  key: string
  siteName: string
  machine: string
  submittedAt: string
  last?: ContributionStatus
  /** The site no longer reports it, for example because the record was removed */
  missing?: boolean
}

function isTracked(value: unknown): value is TrackedContribution {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'number' && typeof item.key === 'string' && typeof item.siteName === 'string'
    && typeof item.machine === 'string' && typeof item.submittedAt === 'string'
}

/** The stored list; empty when storage is blocked, unavailable or holds something else. */
export function readTracked(): TrackedContribution[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isTracked) : []
  } catch {
    return []
  }
}

function writeTracked(items: readonly TrackedContribution[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Private windows and blocked storage: the list lasts only as long as this page
  }
}

interface MyContributionsValue {
  items: TrackedContribution[]
  /** Set while a status check is in flight */
  checking: boolean
  /** Set when the last status check failed; the statuses shown are the ones last reported */
  checkFailed: boolean
  add: (item: TrackedContribution) => void
  remove: (id: number) => void
  /** Records a new status the site reported for one submission, for example after an update */
  setStatus: (id: number, verificationStatus: string) => void
  /** Notes that a rejected submission has been resubmitted, before the next status check says so */
  markResubmitted: (id: number, resubmittedAs: number) => void
  /** The outcome of a tracking link opened in this browser, until dismissed */
  linkNotice: LinkNotice | null
  dismissLinkNotice: () => void
  refresh: () => void
}

const noop = () => undefined

/** Outside the provider (isolated page tests): an empty list that changes nothing. */
const MyContributionsContext = createContext<MyContributionsValue>({
  items: [],
  checking: false,
  checkFailed: false,
  add: noop,
  remove: noop,
  setStatus: noop,
  markResubmitted: noop,
  linkNotice: null,
  dismissLinkNotice: noop,
  refresh: noop,
})

/**
 * Keeps the submissions made from this browser and refreshes their statuses
 * when the site opens, so a decision shows the next time the contributor visits.
 */
export function MyContributionsProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<TrackedContribution[]>(readTracked)
  // A stored list is checked as soon as the site opens
  const [checking, setChecking] = useState(() => readTracked().length > 0)
  const [checkFailed, setCheckFailed] = useState(false)

  const update = useCallback((change: (current: TrackedContribution[]) => TrackedContribution[]) => {
    setItems((current) => {
      const next = change(current)
      writeTracked(next)
      return next
    })
  }, [])

  /** Asks the site for the stored submissions' statuses; state changes only when the answer comes */
  const check = useCallback(() => {
    const stored = readTracked()
    if (stored.length === 0) return
    const batches: { id: number; key: string }[][] = []
    for (let start = 0; start < stored.length; start += BATCH_SIZE) {
      batches.push(stored.slice(start, start + BATCH_SIZE).map(({ id, key }) => ({ id, key })))
    }
    Promise.all(batches.map(checkContributionStatuses))
      .then((results) => {
        const byId = new Map(results.flat().map((status) => [status.id, status]))
        update((current) => current.map((item) => {
          const status = byId.get(item.id)
          // Only the submissions this check asked about can be missing
          if (!status) return stored.some((asked) => asked.id === item.id) ? { ...item, missing: true } : item
          return { ...item, siteName: status.siteName, machine: status.machine, last: status, missing: false }
        }))
        setCheckFailed(false)
      })
      .catch(() => setCheckFailed(true))
      .finally(() => setChecking(false))
  }, [update])

  // Once per visit: the site opening is when a contributor expects news of their submissions
  useEffect(() => {
    check()
  }, [check])

  const refresh = useCallback(() => {
    if (readTracked().length === 0) return
    setChecking(true)
    check()
  }, [check])

  const add = useCallback((item: TrackedContribution) => {
    update((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
  }, [update])

  const remove = useCallback((id: number) => {
    update((current) => current.filter((item) => item.id !== id))
  }, [update])

  const setStatus = useCallback((id: number, verificationStatus: string) => {
    update((current) => current.map((item) => item.id === id && item.last
      ? { ...item, last: { ...item.last, verificationStatus, updatedAt: new Date().toISOString() } }
      : item))
  }, [update])

  const [linkNotice, setLinkNotice] = useState<LinkNotice | null>(null)
  const dismissLinkNotice = useCallback(() => setLinkNotice(null), [])

  // A tracking link adds its submission to this browser; the key leaves the address bar at once
  useEffect(() => {
    function openLink() {
      const match = TRACKING_FRAGMENT.exec(window.location.hash)
      if (!match) return
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
      const id = Number(match[1])
      const key = match[2]
      if (readTracked().some((item) => item.id === id)) {
        setLinkNotice({ kind: 'already', id })
        return
      }
      getOwnContribution(id, key)
        .then((contribution) => {
          update((current) => [{
            id,
            key,
            siteName: contribution.siteName,
            machine: contribution.machine,
            submittedAt: contribution.submittedAt,
            last: contribution,
          }, ...current.filter((item) => item.id !== id)])
          setLinkNotice({ kind: 'added', id })
        })
        .catch(() => setLinkNotice({ kind: 'invalid' }))
    }
    openLink()
    window.addEventListener('hashchange', openLink)
    return () => window.removeEventListener('hashchange', openLink)
  }, [update])

  const markResubmitted = useCallback((id: number, resubmittedAs: number) => {
    update((current) => current.map((item) => item.id === id && item.last
      ? { ...item, last: { ...item.last, resubmittedAs } }
      : item))
  }, [update])

  const value = useMemo(
    () => ({ items, checking, checkFailed, add, remove, setStatus, markResubmitted, linkNotice, dismissLinkNotice, refresh }),
    [items, checking, checkFailed, add, remove, setStatus, markResubmitted, linkNotice, dismissLinkNotice, refresh],
  )
  return <MyContributionsContext.Provider value={value}>{children}</MyContributionsContext.Provider>
}

export function useMyContributions(): MyContributionsValue {
  return useContext(MyContributionsContext)
}
