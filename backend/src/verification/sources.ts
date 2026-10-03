import { createHash } from 'node:crypto'

import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

import type { EvidenceType } from './types.js'

/**
 * Stage 1 — fetch and extract (docs/verification/fr55-design.md §6 stage 1).
 *
 * Fetches one evidence URL with a browser user agent; on any live failure it
 * falls back to the Wayback Machine's latest snapshot. Extracts the main
 * text, the published date and a source class. Never throws on a bad page:
 * the spam gate's "URL does not resolve" rule reads the returned `failure`,
 * so every outcome must come back as a value.
 */

type PageDocument = ReturnType<typeof parseHTML>['document']

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'

const DEFAULT_TIMEOUT_MS = 20_000

/** One fetched page; field names mirror the fetched_source columns in migration 003. */
export interface FetchedSource {
  url: string
  /** Reviewer-facing Wayback snapshot URL, set when the archive was consulted. */
  archivedUrl: string | null
  /** HTTP status of the live attempt; null when the request itself failed (DNS, timeout). */
  httpStatus: number | null
  /** `YYYY-MM-DD` from page metadata, when present. */
  publishedDate: string | null
  /** Classified from the original URL's domain and page signals; null only when there is no page. */
  sourceClass: EvidenceType | null
  /**
   * The page text as it was when checked (D5). This exact string is what
   * claim quote offsets point into, so it is stored verbatim bar
   * deterministic whitespace tidying; Unicode normalisation happens in
   * retrieval only (design §8).
   */
  extractedText: string | null
  /** SHA-256 hex of extractedText; part of the reproducibility tuple (design §8). */
  textSha256: string | null
  fetchedAt: Date
  /** Why there is no text, when there is none. */
  failure: string | null
}

export interface FetchSourceOptions {
  /** Injectable for tests; defaults to the global fetch. */
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  /** Extra attempts against the Wayback Machine when it answers 429/5xx. */
  archiveRetries?: number
  /** Pause between those attempts; zero in tests. */
  archiveRetryDelayMs?: number
}

interface Attempt {
  status: number | null
  html: string | null
  reason: string
}

interface WaybackSnapshot {
  /** The snapshot as a reviewer would open it. */
  displayUrl: string
  /** The `id_` variant, which serves the original bytes without the Wayback toolbar. */
  rawUrl: string
}

const DEFAULT_ARCHIVE_RETRIES = 2
const DEFAULT_ARCHIVE_RETRY_DELAY_MS = 5_000

function isTransient(status: number | null): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchSource(url: string, options: FetchSourceOptions = {}): Promise<FetchedSource> {
  const doFetch = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const archiveRetries = options.archiveRetries ?? DEFAULT_ARCHIVE_RETRIES
  const archiveRetryDelayMs = options.archiveRetryDelayMs ?? DEFAULT_ARCHIVE_RETRY_DELAY_MS

  const empty: FetchedSource = {
    url,
    archivedUrl: null,
    httpStatus: null,
    publishedDate: null,
    sourceClass: null,
    extractedText: null,
    textSha256: null,
    fetchedAt: new Date(),
    failure: null,
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ...empty, failure: 'URL does not parse' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ...empty, failure: `unsupported protocol ${parsed.protocol}` }
  }

  const live = await attempt(doFetch, url, timeoutMs)
  if (live.html !== null) {
    return { ...empty, ...extractPage(url, live.html), httpStatus: live.status }
  }

  const snapshot = await findWaybackSnapshot(doFetch, url, timeoutMs, archiveRetries, archiveRetryDelayMs)
  if (snapshot === null) {
    return { ...empty, httpStatus: live.status, failure: `${live.reason}; no archive snapshot` }
  }

  // The Wayback Machine rate-limits bursts; a verdict should not depend on
  // that, and worker latency is irrelevant (design §4.3), so wait and retry.
  let archived = await attempt(doFetch, snapshot.rawUrl, timeoutMs)
  for (let retry = 0; retry < archiveRetries && isTransient(archived.status); retry++) {
    await sleep(archiveRetryDelayMs)
    archived = await attempt(doFetch, snapshot.rawUrl, timeoutMs)
  }
  if (archived.html === null) {
    return {
      ...empty,
      httpStatus: live.status,
      archivedUrl: snapshot.displayUrl,
      failure: `${live.reason}; archive fetch failed: ${archived.reason}`,
    }
  }

  return {
    ...empty,
    ...extractPage(url, archived.html),
    httpStatus: live.status,
    archivedUrl: snapshot.displayUrl,
  }
}

async function attempt(doFetch: typeof globalThis.fetch, url: string, timeoutMs: number): Promise<Attempt> {
  try {
    const response = await doFetch(url, {
      headers: {
        'user-agent': BROWSER_USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      return { status: response.status, html: null, reason: `HTTP ${response.status}` }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType !== '' && !/html|xml|text\/plain/i.test(contentType)) {
      return { status: response.status, html: null, reason: `unsupported content type ${contentType}` }
    }

    return { status: response.status, html: await response.text(), reason: '' }
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'TimeoutError'
        ? `timed out after ${timeoutMs}ms`
        : `request failed: ${error instanceof Error ? error.message : String(error)}`
    return { status: null, html: null, reason }
  }
}

/** Asks the Wayback availability API for the latest snapshot of the URL, retrying when rate-limited. */
async function findWaybackSnapshot(
  doFetch: typeof globalThis.fetch,
  url: string,
  timeoutMs: number,
  retries: number,
  retryDelayMs: number,
): Promise<WaybackSnapshot | null> {
  try {
    let response = await doFetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    for (let retry = 0; retry < retries && isTransient(response.status); retry++) {
      await sleep(retryDelayMs)
      response = await doFetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })
    }
    if (!response.ok) {
      return null
    }

    const body = (await response.json()) as {
      archived_snapshots?: { closest?: { available?: boolean; url?: string } }
    }
    const closest = body.archived_snapshots?.closest
    if (closest?.available !== true || typeof closest.url !== 'string') {
      return null
    }

    const displayUrl = closest.url.replace(/^http:/, 'https:')
    return { displayUrl, rawUrl: displayUrl.replace(/(\/web\/\d+)\//, '$1id_/') }
  } catch {
    return null
  }
}

function extractPage(
  url: string,
  html: string,
): Pick<FetchedSource, 'publishedDate' | 'sourceClass' | 'extractedText' | 'textSha256' | 'failure'> {
  const { document } = parseHTML(html)

  // Metadata is read before Readability runs, because Readability mutates
  // the document it is given.
  const publishedDate = extractPublishedDate(document)
  const sourceClass = classifySource(url, document)

  let text: string | null
  try {
    const article = new Readability(document as unknown as ConstructorParameters<typeof Readability>[0]).parse()
    text = article?.textContent ?? null
  } catch {
    text = null
  }
  if (text === null || text.trim() === '') {
    // Unreaderable page (navigation-heavy, very short): fall back to the whole
    // body text from a fresh parse, since Readability consumed the first one.
    text = parseHTML(html).document.body?.textContent ?? null
  }

  const extractedText = text === null ? null : normaliseText(text)
  if (extractedText === null || extractedText === '') {
    return { publishedDate, sourceClass, extractedText: null, textSha256: null, failure: 'no extractable text' }
  }

  return {
    publishedDate,
    sourceClass,
    extractedText,
    textSha256: createHash('sha256').update(extractedText, 'utf8').digest('hex'),
    failure: null,
  }
}

/**
 * Deterministic whitespace tidying only: quotes are offsets into this string,
 * so the same page bytes must always produce the same text and hash.
 */
export function normaliseText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Checked in order; the first value that parses to a date wins. */
const META_DATE_SELECTORS = [
  'meta[property="article:published_time"]',
  'meta[name="article:published_time"]',
  'meta[itemprop="datePublished"]',
  'meta[name="datePublished"]',
  'meta[name="publish-date"]',
  'meta[name="publication_date"]',
  'meta[name="dc.date"]',
  'meta[name="dc.date.issued"]',
  'meta[name="dcterms.date"]',
  'meta[name="date"]',
]

export function extractPublishedDate(document: PageDocument): string | null {
  for (const selector of META_DATE_SELECTORS) {
    const date = parseDate(document.querySelector(selector)?.getAttribute('content'))
    if (date !== null) {
      return date
    }
  }

  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const date = parseDate(findDatePublished(JSON.parse(script.textContent ?? '')))
      if (date !== null) {
        return date
      }
    } catch {
      // Invalid JSON-LD is common; keep looking.
    }
  }

  return parseDate(document.querySelector('time[datetime]')?.getAttribute('datetime'))
}

/** Walks JSON-LD, including @graph wrappers, for the first datePublished. */
function findDatePublished(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findDatePublished(item)
      if (found !== null) {
        return found
      }
    }
    return null
  }

  if (node !== null && typeof node === 'object') {
    const record = node as Record<string, unknown>
    if (typeof record.datePublished === 'string') {
      return record.datePublished
    }
    if ('@graph' in record) {
      return findDatePublished(record['@graph'])
    }
  }

  return null
}

function parseDate(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  // A literal date inside the string is taken as written, so a timezone
  // offset cannot shift the published day.
  const literal = /\d{4}-\d{2}-\d{2}/.exec(value)
  if (literal !== null && !Number.isNaN(Date.parse(literal[0]))) {
    return literal[0]
  }

  const time = Date.parse(value)
  if (Number.isNaN(time)) {
    return null
  }
  const parsed = new Date(time)
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}

// Domain lists are deliberately small and editable; an unknown domain falls
// through to page signals, then 'other'. Suffix-matched, so subdomains count.

const PRESS_DOMAINS = [
  'reuters.com',
  'apnews.com',
  'bloomberg.com',
  'ft.com',
  'wsj.com',
  'bbc.com',
  'bbc.co.uk',
  'theguardian.com',
  'afr.com',
  'abc.net.au',
  'smh.com.au',
  'thewest.com.au',
  'mining.com',
  'mining-technology.com',
  'miningweekly.com',
  'im-mining.com',
  'australianmining.com.au',
  'miningmagazine.com',
  'miningmonthly.com',
]

const COMPANY_DOMAINS = [
  'cat.com',
  'caterpillar.com',
  'komatsu.com',
  'komatsu.com.au',
  'mining.komatsu',
  'sandvik.com',
  'rocktechnology.sandvik',
  'home.sandvik',
  'epiroc.com',
  'hitachicm.com',
  'liebherr.com',
  'hexagon.com',
  'hexagonmining.com',
  'asirobots.com',
  'asimining.com',
  'rct-global.com',
  'wencomine.com',
  'riotinto.com',
  'bhp.com',
  'fortescue.com',
  'fmgl.com.au',
  'cidi.ai',
]

const ACADEMIC_DOMAINS = [
  'doi.org',
  'sciencedirect.com',
  'springer.com',
  'ieee.org',
  'researchgate.net',
  'arxiv.org',
  'mdpi.com',
  'tandfonline.com',
  'wiley.com',
  'nature.com',
]

function domainMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

/**
 * Classifies by the original URL's domain, then by page signals, into the
 * SRS evidence_type values (design §6 stage 1). The original URL is used
 * even when the text came from the archive: the class describes the
 * publisher, not the fetch path.
 */
export function classifySource(url: string, document: PageDocument): EvidenceType {
  const parsed = new URL(url)
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

  if (hostname.endsWith('.gov') || /\.gov\.[a-z]{2}$/.test(hostname)) {
    return 'government'
  }
  if (hostname.endsWith('.edu') || /\.(edu|ac)\.[a-z]{2}$/.test(hostname)) {
    return 'academic'
  }
  if (ACADEMIC_DOMAINS.some((domain) => domainMatches(hostname, domain))) {
    return 'academic'
  }
  if (PRESS_DOMAINS.some((domain) => domainMatches(hostname, domain))) {
    return 'news'
  }
  if (COMPANY_DOMAINS.some((domain) => domainMatches(hostname, domain))) {
    return 'company_release'
  }

  const title = document.querySelector('title')?.textContent ?? ''
  if (/(press|media|news)[-_ ]?release/i.test(`${parsed.pathname} ${title}`)) {
    return 'company_release'
  }

  const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content')
  if (ogType === 'article') {
    return 'news'
  }

  return 'other'
}
