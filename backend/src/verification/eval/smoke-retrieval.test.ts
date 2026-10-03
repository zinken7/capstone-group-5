import { describe, expect, it } from 'vitest'

import { decompose } from '../decompose.js'
import { buildAliasMap, retrieve, splitSentences } from '../retrieve.js'
import { loadAliasGroups } from './aliases.js'
import { loadSmokeSet, type SmokeItem } from './smoke.js'

/**
 * Design §9 build step 2's test: for each smoke item with a stored page,
 * retrieval must return the right sentence among its top three candidates.
 * "Right" is the expectation's `sentence` substring; a null sentence means
 * the page holds nothing for that sub-fact and retrieval owes nothing.
 */

const aliasMap = buildAliasMap(loadAliasGroups())
const items = loadSmokeSet()

describe('smoke set shape', () => {
  it('has twenty items with unique keys', () => {
    expect(items).toHaveLength(20)
    expect(new Set(items.map((item) => item.key)).size).toBe(20)
  })

  it('covers the §7.1 required scenarios', () => {
    const keys = new Set(items.map((item) => item.key))
    for (const required of [
      'jarnvik-sparse-honest',
      'witvlakte-403',
      'wandarra-quantity-growth',
      'gunung-instruction-injection',
    ]) {
      expect(keys).toContain(required)
    }
  })

  it('the 403 item fetches live and therefore stores no page', () => {
    const item = items.find((candidate) => candidate.key === 'witvlakte-403')
    expect(item?.page).toBeNull()
    expect(item?.evidenceUrl).toMatch(/^https:\/\/www\.epiroc\.com\//)
  })

  it('ships with every verdict unlabelled', () => {
    for (const item of items) {
      for (const expectation of item.expectations) {
        expect(expectation.verdict).toBeNull()
      }
    }
  })
})

function claimKey(claim: { field: string; subject: string; subFact: string }): string {
  return `${claim.field}/${claim.subject}/${claim.subFact}`
}

const pagedItems = items.flatMap((item): Array<{ item: SmokeItem; storedText: string }> =>
  item.page === null ? [] : [{ item, storedText: item.page.storedText }],
)

for (const { item, storedText } of pagedItems) {
  describe(`retrieval: ${item.key}`, () => {
    const sentences = splitSentences(storedText)
    const claims = decompose(item.submission)

    it('expectations cover exactly the decomposed claims', () => {
      expect(new Set(item.expectations.map(claimKey))).toEqual(new Set(claims.map(claimKey)))
    })

    for (const expectation of item.expectations) {
      const target = expectation.sentence
      if (target === null) {
        continue
      }

      it(`finds ${expectation.field}.${expectation.subFact}${expectation.subject === '' ? '' : ` (${expectation.subject})`} in the top three`, () => {
        const claim = claims.find((candidate) => claimKey(candidate) === claimKey(expectation))
        expect(claim).toBeDefined()
        if (claim === undefined) {
          return
        }

        const top = retrieve(claim.terms, sentences, { aliasMap, topK: 3 })
        expect(
          top.map((sentence) => sentence.text),
          `terms [${claim.terms.join(', ')}] should surface a sentence containing ${JSON.stringify(target)}`,
        ).toSatisfy((texts: string[]) => texts.some((text) => text.includes(target)))
      })
    }

    const forbidden = item.mustNotRetrieve
    if (forbidden !== undefined) {
      it('never surfaces the injected instruction as a candidate', () => {
        for (const claim of claims) {
          const top = retrieve(claim.terms, sentences, { aliasMap, topK: 3 })
          expect(top.some((sentence) => sentence.text.includes(forbidden))).toBe(false)
        }
      })
    }
  })
}
