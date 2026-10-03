import { beforeAll, describe, expect, it } from 'vitest'

import { fetchSource, type FetchedSource } from './sources.js'

/**
 * Design §9 build step 1: fetch + extract against five real vendor pages,
 * including one that returns 403 and must recover through the Wayback
 * Machine. Network-dependent, so gated: run with
 *
 *   LIVE_SOURCES=1 npm test -- src/verification/sources.live.test.ts
 *
 * The default `npm test` run skips this file and stays deterministic.
 */

const PAGES = {
  // Epiroc's WAF returns 403 to non-browser clients, and the Wayback Machine
  // holds a snapshot: the designated archive-fallback case. (cat.com also
  // 403s, but the archive has no capture of its Command page, so it can only
  // demonstrate the no-snapshot failure, which a unit test already covers.)
  epirocInnovation: 'https://www.epiroc.com/en-us/innovation-and-technology',
  komatsuAhs: 'https://www.komatsu.com.au/innovation/autonomous-haulage-system',
  rctGlobal: 'https://www.rct-global.com/',
  rioGudaiDarri:
    'https://www.riotinto.com/en/news/releases/2022/rio-tinto-opens-gudai-darri-its-most-technologically-advanced-mine',
  miningComArticle: 'https://www.mining.com/panama-panel-backs-path-to-cobre-panama-restart/',
} as const

type PageName = keyof typeof PAGES

describe.runIf(process.env.LIVE_SOURCES === '1')('fetchSource on real pages', () => {
  const results = new Map<PageName, FetchedSource>()

  beforeAll(async () => {
    await Promise.all(
      (Object.keys(PAGES) as PageName[]).map(async (name) => {
        results.set(name, await fetchSource(PAGES[name]))
      }),
    )

    for (const [name, result] of results) {
      console.log(
        `${name}: status=${String(result.httpStatus)} archived=${result.archivedUrl !== null ? 'yes' : 'no'} ` +
          `class=${String(result.sourceClass)} date=${String(result.publishedDate)} ` +
          `text=${String(result.extractedText?.length ?? null)} failure=${String(result.failure)}`,
      )
    }
  }, 180_000)

  function resultOf(name: PageName): FetchedSource {
    const result = results.get(name)
    if (result === undefined) {
      throw new Error(`no result for ${name}`)
    }
    return result
  }

  it('recovers the 403 page through the archive', () => {
    const result = resultOf('epirocInnovation')
    expect(result.httpStatus).not.toBe(200)
    expect(result.archivedUrl).toMatch(/^https:\/\/web\.archive\.org\/web\/\d+\//)
    expect(result.extractedText).not.toBeNull()
    // Epiroc renders most content with JavaScript; the server-rendered prose
    // is a few hundred characters, and that is all any fetcher without a
    // browser gets — a known limit to report, not to hide.
    expect((result.extractedText ?? '').length).toBeGreaterThan(300)
    expect(result.sourceClass).toBe('company_release')
    expect(result.failure).toBeNull()
  })

  it('extracts a vendor product page live', () => {
    const result = resultOf('komatsuAhs')
    expect(result.httpStatus).toBe(200)
    expect(result.archivedUrl).toBeNull()
    expect((result.extractedText ?? '').length).toBeGreaterThan(500)
    expect(result.sourceClass).toBe('company_release')
  })

  it('extracts a second vendor page live', () => {
    const result = resultOf('rctGlobal')
    expect(result.httpStatus).toBe(200)
    expect((result.extractedText ?? '').length).toBeGreaterThan(500)
    expect(result.sourceClass).toBe('company_release')
  })

  it('extracts a company press release', () => {
    const result = resultOf('rioGudaiDarri')
    expect(result.httpStatus).toBe(200)
    expect(result.extractedText ?? '').toMatch(/gudai-darri/i)
    expect(result.sourceClass).toBe('company_release')
    // This page carries no date metadata at all (a BusinessWire embed), so a
    // null publishedDate is the correct outcome: metadata only, no guessing.
  })

  it('extracts a dated article from an established press site', () => {
    const result = resultOf('miningComArticle')
    expect(result.httpStatus).toBe(200)
    expect((result.extractedText ?? '').length).toBeGreaterThan(500)
    expect(result.sourceClass).toBe('news')
    expect(result.publishedDate).toMatch(/^20\d\d-/)
  })

  it('every fetched text carries its hash', () => {
    for (const result of results.values()) {
      expect(result.extractedText === null).toBe(result.textSha256 === null)
    }
  })
})
