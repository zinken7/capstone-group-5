import { describe, expect, it } from 'vitest'

import { buildAliasMap, retrieve, splitSentences } from './retrieve.js'

describe('splitSentences', () => {
  const text = 'Autonomy at Wandarra\n\nThe fleet reached 36 trucks. Production rose.\nA heading without punctuation\nFinal line here.'

  it('returns offsets that slice back to the sentence text', () => {
    for (const sentence of splitSentences(text)) {
      expect(text.slice(sentence.start, sentence.end)).toBe(sentence.text)
    }
  })

  it('splits on sentence boundaries and on lines', () => {
    expect(splitSentences(text).map((sentence) => sentence.text)).toEqual([
      'Autonomy at Wandarra',
      'The fleet reached 36 trucks.',
      'Production rose.',
      'A heading without punctuation',
      'Final line here.',
    ])
  })

  it('numbers sentences consecutively and skips blank lines', () => {
    expect(splitSentences(text).map((sentence) => sentence.index)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('retrieve', () => {
  const text = [
    'Wandarra Iron is an iron ore operation in the Pilbara region of Western Australia.',
    'The company reported record safety performance for the quarter.',
    'The site now operates thirty-six autonomous haul trucks around the clock.',
    'A new workshop opened near the village.',
  ].join('\n')
  const sentences = splitSentences(text)

  it('ranks the sentence matching the entity terms first', () => {
    const ranked = retrieve(['Wandarra Iron', 'Australia'], sentences, { topK: 3 })
    expect(ranked[0]?.text).toContain('Pilbara region of Western Australia')
  })

  it('matches a written-out number against a digit term', () => {
    const ranked = retrieve(['36', 'trucks'], sentences, { topK: 1 })
    expect(ranked[0]?.text).toContain('thirty-six autonomous haul trucks')
  })

  it('returns nothing when no term appears anywhere', () => {
    expect(retrieve(['Komatsu', '930E'], sentences)).toEqual([])
  })

  it('respects topK and never returns zero-score sentences', () => {
    const ranked = retrieve(['Wandarra Iron'], sentences, { topK: 2 })
    expect(ranked.length).toBeLessThanOrEqual(2)
    for (const sentence of ranked) {
      expect(sentence.score).toBeGreaterThan(0)
    }
  })

  it('expands query terms through the alias map', () => {
    const aliasText = 'The site runs the Cat Command system across its truck fleet.\nWeather was mild in March.'
    const aliasSentences = splitSentences(aliasText)
    const aliasMap = buildAliasMap([['Caterpillar', 'Cat', 'Caterpillar Inc.']])

    expect(retrieve(['Caterpillar'], aliasSentences)).toEqual([])
    const ranked = retrieve(['Caterpillar'], aliasSentences, { aliasMap })
    expect(ranked[0]?.text).toContain('Cat Command')
  })

  it('matches a non-Latin alias after NFKC-normalised lookup', () => {
    const jaText = 'The haul fleet was supplied by 日立建機 under a five-year agreement.\nOther suppliers were not named.'
    const jaSentences = splitSentences(jaText)
    const aliasMap = buildAliasMap([['Hitachi Construction Machinery', 'Hitachi', 'HCM', '日立建機']])

    const ranked = retrieve(['Hitachi Construction Machinery'], jaSentences, { aliasMap })
    expect(ranked[0]?.text).toContain('日立建機')
  })
})

describe('buildAliasMap', () => {
  it('is bidirectional and case-insensitive on lookup', () => {
    const map = buildAliasMap([['Rio Tinto', 'Rio']])
    expect(map.get('rio tinto')).toEqual(['Rio'])
    expect(map.get('rio')).toEqual(['Rio Tinto'])
  })

  it('merges groups sharing a surface form without duplicating entries', () => {
    const map = buildAliasMap([
      ['Hexagon', 'Hexagon Mining'],
      ['Hexagon', 'Hexagon AB'],
    ])
    expect(map.get('hexagon')).toEqual(['Hexagon Mining', 'Hexagon AB'])
  })
})
