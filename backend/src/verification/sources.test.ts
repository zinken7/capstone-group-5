import { createHash } from 'node:crypto'

import { parseHTML } from 'linkedom'
import { describe, expect, it } from 'vitest'

import { classifySource, extractPublishedDate, fetchSource, normaliseText } from './sources.js'

/** Enough real-looking prose for Readability to accept the page as an article. */
const PARAGRAPHS = [
  'Wandarra Iron has commissioned thirty-six autonomous haul trucks at its Pilbara operation, the company said on Tuesday. The fleet operates around the clock under supervision from an integrated remote operations centre located more than a thousand kilometres away in Perth.',
  'The trucks are Caterpillar 793F units retrofitted with the Command for Hauling system. Site management said the conversion program began in 2019 and reached full fleet autonomy this quarter, with loading, hauling and dumping cycles now running without an operator on board.',
  'Production guidance for the year is unchanged. The company expects the autonomous fleet to improve utilisation by reducing shift change downtime, and reported no lost-time injuries associated with the haulage circuit since the program began.',
]

function articleHtml({
  title = 'Wandarra Iron deploys 36 autonomous trucks',
  head = '',
  body = PARAGRAPHS.map((text) => `<p>${text}</p>`).join('\n'),
}: { title?: string; head?: string; body?: string } = {}): string {
  return `<!doctype html>
<html>
<head><title>${title}</title>${head}</head>
<body>
<nav><a href="/">Home</a> <a href="/contact">Contact</a></nav>
<article><h1>${title}</h1>
${body}
</article>
</body>
</html>`
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

/** A fetch stub that routes by URL and records every request it receives. */
function stubFetch(handler: (url: string) => Response | Promise<Response>): {
  fetch: typeof globalThis.fetch
  requests: string[]
} {
  const requests: string[] = []
  const impl = async (input: Parameters<typeof globalThis.fetch>[0]): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    requests.push(url)
    return handler(url)
  }
  return { fetch: impl as typeof globalThis.fetch, requests }
}

const PAGE_URL = 'https://example-vendor.com/news/press-release-automation'
const WAYBACK_API_PREFIX = 'https://archive.org/wayback/available'
const SNAPSHOT_DISPLAY_URL = 'https://web.archive.org/web/20240101000000/' + PAGE_URL
const SNAPSHOT_RAW_URL = 'https://web.archive.org/web/20240101000000id_/' + PAGE_URL

function waybackAvailable(): Response {
  return Response.json({
    url: PAGE_URL,
    // The availability API answers with an http:// snapshot URL.
    archived_snapshots: { closest: { status: '200', available: true, url: SNAPSHOT_DISPLAY_URL.replace('https:', 'http:'), timestamp: '20240101000000' } },
  })
}

function waybackEmpty(): Response {
  return Response.json({ url: PAGE_URL, archived_snapshots: {} })
}

describe('fetchSource, live page', () => {
  it('extracts text, hash, date and class from a 200 response', async () => {
    const html = articleHtml({
      head: '<meta property="article:published_time" content="2024-05-14T09:30:00+08:00">',
    })
    const { fetch, requests } = stubFetch(() => htmlResponse(html))

    const result = await fetchSource(PAGE_URL, { fetch })

    expect(requests).toEqual([PAGE_URL])
    expect(result.httpStatus).toBe(200)
    expect(result.archivedUrl).toBeNull()
    expect(result.failure).toBeNull()
    expect(result.extractedText).toContain('thirty-six autonomous haul trucks')
    expect(result.publishedDate).toBe('2024-05-14')
    // Unknown domain, but the path says press release.
    expect(result.sourceClass).toBe('company_release')
    expect(result.textSha256).toBe(createHash('sha256').update(result.extractedText ?? '', 'utf8').digest('hex'))
  })

  it('produces the same text and hash for the same page bytes', async () => {
    const html = articleHtml()
    const first = await fetchSource(PAGE_URL, { fetch: stubFetch(() => htmlResponse(html)).fetch })
    const second = await fetchSource(PAGE_URL, { fetch: stubFetch(() => htmlResponse(html)).fetch })

    expect(first.extractedText).toBe(second.extractedText)
    expect(first.textSha256).toBe(second.textSha256)
  })

  it('reports a page with no text as a failure, not a crash', async () => {
    const { fetch } = stubFetch(() => htmlResponse('<!doctype html><html><head></head><body></body></html>'))

    const result = await fetchSource(PAGE_URL, { fetch })

    expect(result.extractedText).toBeNull()
    expect(result.textSha256).toBeNull()
    expect(result.failure).toBe('no extractable text')
  })
})

describe('fetchSource, archive fallback', () => {
  it('falls back to the latest Wayback snapshot on a 403', async () => {
    const { fetch, requests } = stubFetch((url) => {
      if (url === PAGE_URL) return htmlResponse('Forbidden', 403)
      if (url.startsWith(WAYBACK_API_PREFIX)) return waybackAvailable()
      if (url === SNAPSHOT_RAW_URL) return htmlResponse(articleHtml())
      throw new Error(`unexpected request: ${url}`)
    })

    const result = await fetchSource(PAGE_URL, { fetch })

    // The raw id_ variant is fetched so the Wayback toolbar never enters the text.
    expect(requests).toEqual([PAGE_URL, `${WAYBACK_API_PREFIX}?url=${encodeURIComponent(PAGE_URL)}`, SNAPSHOT_RAW_URL])
    expect(result.httpStatus).toBe(403)
    expect(result.archivedUrl).toBe(SNAPSHOT_DISPLAY_URL)
    expect(result.extractedText).toContain('thirty-six autonomous haul trucks')
    expect(result.failure).toBeNull()
  })

  it('falls back on a network error, with a null live status', async () => {
    const { fetch } = stubFetch((url) => {
      if (url === PAGE_URL) throw new TypeError('fetch failed')
      if (url.startsWith(WAYBACK_API_PREFIX)) return waybackAvailable()
      if (url === SNAPSHOT_RAW_URL) return htmlResponse(articleHtml())
      throw new Error(`unexpected request: ${url}`)
    })

    const result = await fetchSource(PAGE_URL, { fetch })

    expect(result.httpStatus).toBeNull()
    expect(result.archivedUrl).toBe(SNAPSHOT_DISPLAY_URL)
    expect(result.extractedText).not.toBeNull()
  })

  it('reports both failures when no snapshot exists', async () => {
    const { fetch } = stubFetch((url) => {
      if (url === PAGE_URL) return htmlResponse('Forbidden', 403)
      if (url.startsWith(WAYBACK_API_PREFIX)) return waybackEmpty()
      throw new Error(`unexpected request: ${url}`)
    })

    const result = await fetchSource(PAGE_URL, { fetch })

    expect(result.httpStatus).toBe(403)
    expect(result.archivedUrl).toBeNull()
    expect(result.extractedText).toBeNull()
    expect(result.failure).toBe('HTTP 403; no archive snapshot')
  })

  it('retries the snapshot fetch when the Wayback Machine rate-limits', async () => {
    let snapshotRequests = 0
    const { fetch, requests } = stubFetch((url) => {
      if (url === PAGE_URL) return htmlResponse('Forbidden', 403)
      if (url.startsWith(WAYBACK_API_PREFIX)) return waybackAvailable()
      if (url === SNAPSHOT_RAW_URL) {
        snapshotRequests += 1
        return snapshotRequests === 1 ? new Response('rate limited', { status: 429 }) : htmlResponse(articleHtml())
      }
      throw new Error(`unexpected request: ${url}`)
    })

    const result = await fetchSource(PAGE_URL, { fetch, archiveRetryDelayMs: 0 })

    expect(requests.filter((url) => url === SNAPSHOT_RAW_URL)).toHaveLength(2)
    expect(result.extractedText).toContain('thirty-six autonomous haul trucks')
    expect(result.failure).toBeNull()
  })

  it('gives up after the configured archive retries', async () => {
    const { fetch, requests } = stubFetch((url) => {
      if (url === PAGE_URL) return htmlResponse('Forbidden', 403)
      if (url.startsWith(WAYBACK_API_PREFIX)) return waybackAvailable()
      if (url === SNAPSHOT_RAW_URL) return new Response('rate limited', { status: 429 })
      throw new Error(`unexpected request: ${url}`)
    })

    const result = await fetchSource(PAGE_URL, { fetch, archiveRetries: 1, archiveRetryDelayMs: 0 })

    expect(requests.filter((url) => url === SNAPSHOT_RAW_URL)).toHaveLength(2)
    expect(result.extractedText).toBeNull()
    expect(result.failure).toBe('HTTP 403; archive fetch failed: HTTP 429')
  })

  it('treats a non-HTML live response as a failure and still tries the archive', async () => {
    const { fetch } = stubFetch((url) => {
      if (url === PAGE_URL) return new Response('%PDF-1.7', { status: 200, headers: { 'content-type': 'application/pdf' } })
      if (url.startsWith(WAYBACK_API_PREFIX)) return waybackEmpty()
      throw new Error(`unexpected request: ${url}`)
    })

    const result = await fetchSource(PAGE_URL, { fetch })

    expect(result.extractedText).toBeNull()
    expect(result.failure).toContain('unsupported content type application/pdf')
  })
})

describe('fetchSource, bad input', () => {
  it('returns a failure for an unparseable URL without fetching', async () => {
    const { fetch, requests } = stubFetch(() => htmlResponse(''))

    const result = await fetchSource('not a url', { fetch })

    expect(requests).toEqual([])
    expect(result.failure).toBe('URL does not parse')
  })

  it('refuses non-http protocols', async () => {
    const { fetch, requests } = stubFetch(() => htmlResponse(''))

    const result = await fetchSource('ftp://example.com/report.txt', { fetch })

    expect(requests).toEqual([])
    expect(result.failure).toBe('unsupported protocol ftp:')
  })
})

describe('extractPublishedDate', () => {
  function documentOf(head: string): ReturnType<typeof parseHTML>['document'] {
    return parseHTML(`<html><head>${head}</head><body><p>x</p></body></html>`).document
  }

  it('reads JSON-LD datePublished, including inside @graph', () => {
    const head = `<script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":"NewsArticle","datePublished":"2023-11-02T08:00:00Z"}]}
    </script>`
    expect(extractPublishedDate(documentOf(head))).toBe('2023-11-02')
  })

  it('reads a time element when no metadata is present', () => {
    const { document } = parseHTML('<html><body><time datetime="2022-07-19">19 July 2022</time></body></html>')
    expect(extractPublishedDate(document)).toBe('2022-07-19')
  })

  it('keeps the written date rather than shifting it across timezones', () => {
    expect(extractPublishedDate(documentOf('<meta name="date" content="2024-06-01T00:30:00+10:00">'))).toBe('2024-06-01')
  })

  it('returns null when nothing parses as a date', () => {
    expect(extractPublishedDate(documentOf('<meta name="date" content="last Tuesday">'))).toBeNull()
  })
})

describe('classifySource', () => {
  const plain = parseHTML('<html><head><title>Page</title></head><body></body></html>').document

  it('classifies by domain suffix', () => {
    expect(classifySource('https://www.industry.gov.au/report', plain)).toBe('government')
    expect(classifySource('https://www.sciencedirect.com/science/article/pii/S1', plain)).toBe('academic')
    expect(classifySource('https://www.reuters.com/markets/commodities/story', plain)).toBe('news')
    expect(classifySource('https://www.epiroc.com/en-au/products', plain)).toBe('company_release')
  })

  it('uses page signals for unknown domains', () => {
    const pressTitle = parseHTML('<html><head><title>Media Release: new fleet</title></head><body></body></html>').document
    expect(classifySource('https://unknown-miner.example.com/2024/fleet', pressTitle)).toBe('company_release')

    const ogArticle = parseHTML('<html><head><meta property="og:type" content="article"></head><body></body></html>').document
    expect(classifySource('https://some-outlet.example.com/story', ogArticle)).toBe('news')

    expect(classifySource('https://some-blog.example.com/post', plain)).toBe('other')
  })
})

describe('normaliseText', () => {
  it('is whitespace-only and deterministic', () => {
    const raw = 'First line  with\tgaps \r\nSecond line\r\r\n\n\n\nThird line '
    expect(normaliseText(raw)).toBe('First line with gaps\nSecond line\n\nThird line')
    expect(normaliseText(raw)).toBe(normaliseText(raw))
  })
})
