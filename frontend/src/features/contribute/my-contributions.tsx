import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { checkContributionStatuses, getOwnContribution } from '../../lib/api/contributions'
import { checkCorrectionStatuses, getOwnCorrection } from '../../lib/api/corrections'
import type { ContributionStatus, CorrectionTracking } from './types'

/** Where this browser keeps the submissions made from it (FR-59) */
export const STORAGE_KEY = 'mining-market-map.my-contributions.v1'
/** The status check takes this many submissions per request */
const BATCH_SIZE = 50
/** #track=<id>.<key>, or c<id> for a correction: the fragment never reaches the server, its logs or a Referer (FR-61) */
const TRACKING_FRAGMENT = /^#track=(c?)(\d+)\.([A-Za-z0-9_-]{43})$/

/** The private link that adds a submission or a proposed correction to the list in another browser (FR-61) */
export function trackingLink(id: number, key: string, kind: TrackedKind = 'submission'): string {
  return `${window.location.origin}/contribute?tab=mine#track=${kind === 'correction' ? 'c' : ''}${id}.${key}`
}

export type TrackedKind = 'submission' | 'correction'

/** What happened to a tracking link opened in this browser */
/** A message over the list: what a tracking link did, or that a correction was proposed again */
export type ListNotice = { kind: 'added' | 'already'; id: number; entry: TrackedKind } | { kind: 'invalid' } | { kind: 'proposed'; id: number }

/** A submission or proposed correction made from this browser, with the last status the site reported for it */
export interface TrackedContribution {
  /** Absent on entries stored before corrections were followed: those are submissions */
  kind?: TrackedKind
  /** The submission's record id, or the correction's own id */
  id: number
  /** A correction's record */
  deploymentId?: number
  /** The submission's private key; it lets this browser read and update the submission */
  key: string
  siteName: string
  machine: string
  submittedAt: string
  last?: ContributionStatus
  /** A correction's last reported status (#223) */
  lastCorrection?: CorrectionTracking
  /** A correction proposed again replaces this one */
  proposedAgainAs?: number
  /** The site no longer reports it, for example because the record was removed */
  missing?: boolean
}

export const isCorrection = (item: TrackedContribution) => item.kind === 'correction'
const sameEntry = (a: { id: number; kind?: TrackedKind }, b: { id: number; kind?: TrackedKind }) =>
  a.id === b.id && (a.kind ?? 'submission') === (b.kind ?? 'submission')

/** Waiting on the contributor: a submission or a correction they were asked to change */
export function needsChanges(item: TrackedContribution): boolean {
  if (item.missing) return false
  return isCorrection(item)
    ? item.lastCorrection?.status === 'needs_changes' && item.proposedAgainAs === undefined
    : item.last?.verificationStatus === 'changes_requested'
}

function isTracked(value: unknown): value is TrackedContribution {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'number' && typeof item.key === 'string' && typeof item.siteName === 'string'
    && typeof item.machine === 'string' && typeof item.submittedAt === 'string'
}

/**
 * One application: a submission and its resubmissions, with the corrections
 * proposed to its record. Only the latest attempts are current; the ones
 * they replaced are its history.
 */
export interface ContributionGroup {
  key: string
  /** The latest submission of a chain of resubmissions; absent when only corrections were made from here */
  submission?: TrackedContribution
  /** Corrections not yet proposed again, newest first */
  corrections: TrackedContribution[]
  /** Earlier attempts, newest first: submissions that were resubmitted and corrections that were proposed again */
  history: TrackedContribution[]
  /** When the application last had something sent, for ordering */
  latest: string
}

/** Groups the entries by application, so one application shows once with its earlier attempts behind it. */
export function groupContributions(items: readonly TrackedContribution[]): ContributionGroup[] {
  const submissions = items.filter((item) => !isCorrection(item))
  const byId = new Map(submissions.map((item) => [item.id, item]))
  // Linked from either side: a new resubmission may not be checked yet, but the one it replaces already knows it
  const previousOf = new Map<number, number>()
  for (const item of submissions) {
    const previous = item.last?.resubmissionOf
    if (previous && byId.has(previous)) previousOf.set(item.id, previous)
    const next = item.last?.resubmittedAs
    if (next && byId.has(next)) previousOf.set(next, item.id)
  }
  const rootOf = (id: number) => {
    let current = id
    const seen = new Set<number>()
    while (previousOf.has(current) && !seen.has(current)) {
      seen.add(current)
      current = previousOf.get(current) as number
    }
    return current
  }

  const members = new Map<string, { submissions: TrackedContribution[]; corrections: TrackedContribution[] }>()
  const memberOf = (key: string) => {
    const existing = members.get(key)
    if (existing) return existing
    const created = { submissions: [] as TrackedContribution[], corrections: [] as TrackedContribution[] }
    members.set(key, created)
    return created
  }
  const groupOfRecord = new Map<number, string>()
  for (const item of submissions) {
    const key = `s${rootOf(item.id)}`
    memberOf(key).submissions.push(item)
    groupOfRecord.set(item.id, key)
  }
  for (const item of items.filter(isCorrection)) {
    const record = item.deploymentId ?? item.lastCorrection?.deploymentId
    memberOf((record !== undefined ? groupOfRecord.get(record) : undefined) ?? `r${record ?? `c${item.id}`}`).corrections.push(item)
  }

  return [...members.entries()].map(([key, group]) => {
    // A resubmission always has a higher id than the record it replaces
    const chain = [...group.submissions].sort((a, b) => a.id - b.id)
    const correctionIds = new Set(group.corrections.map((item) => item.id))
    const replaced = group.corrections.filter((item) => item.proposedAgainAs !== undefined && correctionIds.has(item.proposedAgainAs))
    return {
      key,
      submission: chain.at(-1),
      corrections: group.corrections.filter((item) => !replaced.includes(item)).sort((a, b) => b.id - a.id),
      history: [...chain.slice(0, -1), ...replaced].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      latest: [...group.submissions, ...group.corrections].map((item) => item.submittedAt).sort().at(-1) ?? '',
    }
  }).sort((a, b) => b.latest.localeCompare(a.latest))
}

/** The stored list; empty when storage is blocked, unavailable or holds something else. */
export function readTracked(): TrackedContribution[] {
  return readStored() ?? []
}

/** The stored list, or null when storage cannot be read, so a blocked storage is not mistaken for an empty list */
function readStored(): TrackedContribution[] | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isTracked) : []
  } catch {
    return null
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
  remove: (id: number, kind?: TrackedKind) => void
  /** Notes that a correction was proposed again as a new one */
  markProposedAgain: (id: number, proposedAgainAs: number) => void
  /** Records a new status the site reported for one submission, for example after an update */
  setStatus: (id: number, verificationStatus: string) => void
  /** Notes that a rejected submission has been resubmitted, before the next status check says so */
  markResubmitted: (id: number, resubmittedAs: number) => void
  /** The outcome of a tracking link opened in this browser, until dismissed */
  notice: ListNotice | null
  dismissNotice: () => void
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
  markProposedAgain: noop,
  setStatus: noop,
  markResubmitted: noop,
  notice: null,
  dismissNotice: noop,
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

  const [notice, setNotice] = useState<ListNotice | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const update = useCallback((change: (current: TrackedContribution[]) => TrackedContribution[]) => {
    setItems((current) => {
      // Another tab may have added entries since this one last read them, so each change starts from what is stored
      const next = change(readStored() ?? current)
      writeTracked(next)
      return next
    })
  }, [])

  // Entries added or changed in another tab show here too
  useEffect(() => {
    function reload(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) setItems(readTracked())
    }
    window.addEventListener('storage', reload)
    return () => window.removeEventListener('storage', reload)
  }, [])

  /** Asks the site for the stored submissions' statuses; state changes only when the answer comes */
  const check = useCallback(() => {
    const stored = readTracked()
    if (stored.length === 0) return
    const batches = (items: TrackedContribution[]) => {
      const pairs = items.map(({ id, key }) => ({ id, key }))
      const result: { id: number; key: string }[][] = []
      for (let start = 0; start < pairs.length; start += BATCH_SIZE) result.push(pairs.slice(start, start + BATCH_SIZE))
      return result
    }
    const submissions = stored.filter((item) => !isCorrection(item))
    const corrections = stored.filter(isCorrection)
    Promise.all([
      Promise.all(batches(submissions).map(checkContributionStatuses)),
      Promise.all(batches(corrections).map(checkCorrectionStatuses)),
    ])
      .then(([submissionResults, correctionResults]) => {
        const submissionById = new Map(submissionResults.flat().map((status) => [status.id, status]))
        const correctionById = new Map(correctionResults.flat().map((status) => [status.id, status]))
        update((current) => current.map((item) => {
          // Only the entries this check asked about can be missing
          const asked = stored.some((entry) => sameEntry(entry, item))
          if (isCorrection(item)) {
            const status = correctionById.get(item.id)
            if (!status) return asked ? { ...item, missing: true } : item
            return { ...item, siteName: status.siteName, machine: status.machine, lastCorrection: status, missing: false }
          }
          const status = submissionById.get(item.id)
          if (!status) return asked ? { ...item, missing: true } : item
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
    update((current) => [item, ...current.filter((existing) => !sameEntry(existing, item))])
  }, [update])

  const remove = useCallback((id: number, kind: TrackedKind = 'submission') => {
    update((current) => current.filter((item) => !sameEntry(item, { id, kind })))
  }, [update])

  const markProposedAgain = useCallback((id: number, proposedAgainAs: number) => {
    update((current) => current.map((item) => isCorrection(item) && item.id === id ? { ...item, proposedAgainAs } : item))
    // Told over the list, as the row that sent it moves under Earlier attempts
    setNotice({ kind: 'proposed', id: proposedAgainAs })
  }, [update])

  const setStatus = useCallback((id: number, verificationStatus: string) => {
    update((current) => current.map((item) => !isCorrection(item) && item.id === id && item.last
      ? { ...item, last: { ...item.last, verificationStatus, updatedAt: new Date().toISOString() } }
      : item))
  }, [update])


  // A tracking link adds its submission to this browser; the key leaves the address bar at once
  useEffect(() => {
    function openLink() {
      const match = TRACKING_FRAGMENT.exec(window.location.hash)
      if (!match) return
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
      const kind: TrackedKind = match[1] === 'c' ? 'correction' : 'submission'
      const id = Number(match[2])
      const key = match[3]
      if (readTracked().some((item) => sameEntry(item, { id, kind }))) {
        setNotice({ kind: 'already', id, entry: kind })
        return
      }
      const opened: Promise<TrackedContribution> = kind === 'correction'
        ? getOwnCorrection(id, key).then((correction) => ({
            kind, id, key, deploymentId: correction.deploymentId, siteName: correction.siteName, machine: correction.machine,
            submittedAt: correction.submittedAt,
            // The stored status leaves out the record, which is read again when proposing anew
            lastCorrection: { ...correction, record: undefined },
          }))
        : getOwnContribution(id, key).then((contribution) => ({
            id, key, siteName: contribution.siteName, machine: contribution.machine, submittedAt: contribution.submittedAt, last: contribution,
          }))
      opened
        .then((entry) => {
          update((current) => [entry, ...current.filter((item) => !sameEntry(item, entry))])
          setNotice({ kind: 'added', id, entry: kind })
        })
        .catch(() => setNotice({ kind: 'invalid' }))
    }
    openLink()
    window.addEventListener('hashchange', openLink)
    return () => window.removeEventListener('hashchange', openLink)
  }, [update])

  const markResubmitted = useCallback((id: number, resubmittedAs: number) => {
    update((current) => current.map((item) => !isCorrection(item) && item.id === id && item.last
      ? { ...item, last: { ...item.last, resubmittedAs } }
      : item))
  }, [update])

  const value = useMemo(
    () => ({ items, checking, checkFailed, add, remove, markProposedAgain, setStatus, markResubmitted, notice, dismissNotice, refresh }),
    [items, checking, checkFailed, add, remove, markProposedAgain, setStatus, markResubmitted, notice, dismissNotice, refresh],
  )
  return <MyContributionsContext.Provider value={value}>{children}</MyContributionsContext.Provider>
}

export function useMyContributions(): MyContributionsValue {
  return useContext(MyContributionsContext)
}
