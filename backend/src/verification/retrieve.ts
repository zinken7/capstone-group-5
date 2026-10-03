/**
 * Stage 3 — retrieve (docs/verification/fr55-design.md §6 stage 3).
 *
 * Splits the stored source text into sentences with offsets, then ranks them
 * per sub-fact by BM25 over the claim's entity terms, expanded through an
 * alias map. NFKC, lowercasing and number-word normalisation apply to
 * matching ONLY (design §8): offsets always index the stored text verbatim.
 *
 * The alias map is an input, not a database read — the module runs without a
 * database, and the map is built from the seed JSON until the alias tables
 * land (team decision).
 */

export interface Sentence {
  index: number
  text: string
  /** Offsets into the stored source text; text === storedText.slice(start, end). */
  start: number
  end: number
}

export interface RankedSentence extends Sentence {
  score: number
}

/** Lowercased NFKC surface form → the other surface forms in its alias group. */
export type AliasMap = ReadonlyMap<string, readonly string[]>

export interface RetrieveOptions {
  aliasMap?: AliasMap
  /** "Top few" per the design; candidates the verifier will see. */
  topK?: number
}

const DEFAULT_TOP_K = 5

const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' })

/**
 * Newlines in the extracted text separate blocks (headings, list items,
 * paragraphs), so each line is segmented on its own: the segmenter alone
 * would glue an unpunctuated heading to the following paragraph.
 */
export function splitSentences(text: string): Sentence[] {
  const sentences: Sentence[] = []
  let blockStart = 0

  for (const block of text.split('\n')) {
    for (const segment of sentenceSegmenter.segment(block)) {
      const raw = segment.segment
      const leading = raw.length - raw.trimStart().length
      const trimmed = raw.trim()
      if (trimmed !== '') {
        const start = blockStart + segment.index + leading
        sentences.push({ index: sentences.length, text: trimmed, start, end: start + trimmed.length })
      }
    }
    blockStart += block.length + 1
  }

  return sentences
}

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
}

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

const TENS_PATTERN = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[ -](one|two|three|four|five|six|seven|eight|nine))?\b/g
const UNITS_PATTERN =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/g

/** "thirty-six" → "36", so a written-out count matches a submitted number (design §6 stage 3). Covers 0–99. */
function replaceNumberWords(value: string): string {
  return value
    .replace(TENS_PATTERN, (_match, tens: string, unit: string | undefined) =>
      String((TENS[tens] ?? 0) + (unit === undefined ? 0 : (UNITS[unit] ?? 0))),
    )
    .replace(UNITS_PATTERN, (match) => String(UNITS[match] ?? match))
}

/** Matching-only normalisation; never applied to stored text or offsets. */
function tokenize(value: string): string[] {
  return replaceNumberWords(value.normalize('NFKC').toLowerCase())
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token !== '')
}

/**
 * Builds the alias map from groups of surface forms that name the same
 * entity, e.g. ['Caterpillar', 'Cat', 'Caterpillar Inc.']. Lookup by any
 * member returns the others.
 */
export function buildAliasMap(groups: Iterable<readonly string[]>): AliasMap {
  const map = new Map<string, string[]>()

  for (const group of groups) {
    for (const member of group) {
      const key = member.normalize('NFKC').toLowerCase().trim()
      if (key === '') {
        continue
      }
      const others = group.filter((other) => other !== member)
      const existing = map.get(key)
      if (existing === undefined) {
        map.set(key, [...others])
      } else {
        for (const other of others) {
          if (!existing.includes(other)) {
            existing.push(other)
          }
        }
      }
    }
  }

  return map
}

/** The claim's entity terms, tokenized, plus the tokens of every alias of each term. */
function queryTokens(terms: readonly string[], aliasMap: AliasMap | undefined): Set<string> {
  const tokens = new Set<string>()

  for (const term of terms) {
    for (const token of tokenize(term)) {
      tokens.add(token)
    }
    const aliases = aliasMap?.get(term.normalize('NFKC').toLowerCase().trim()) ?? []
    for (const alias of aliases) {
      for (const token of tokenize(alias)) {
        tokens.add(token)
      }
    }
  }

  return tokens
}

const BM25_K1 = 1.2
const BM25_B = 0.75

/**
 * Ranks sentences for one sub-fact's entity terms. Sentences with no term
 * overlap are never returned: no candidates means stage 4 is skipped and the
 * verdict is insufficient (design §6 stage 3).
 */
export function retrieve(terms: readonly string[], sentences: readonly Sentence[], options: RetrieveOptions = {}): RankedSentence[] {
  const topK = options.topK ?? DEFAULT_TOP_K
  const query = queryTokens(terms, options.aliasMap)
  if (query.size === 0 || sentences.length === 0) {
    return []
  }

  const docs = sentences.map((sentence) => tokenize(sentence.text))
  const totalLength = docs.reduce((sum, doc) => sum + doc.length, 0)
  const averageLength = totalLength === 0 ? 1 : totalLength / docs.length

  const documentFrequency = new Map<string, number>()
  for (const token of query) {
    const df = docs.reduce((count, doc) => count + (doc.includes(token) ? 1 : 0), 0)
    documentFrequency.set(token, df)
  }

  const ranked: RankedSentence[] = []
  for (const [position, sentence] of sentences.entries()) {
    const doc = docs[position] ?? []
    let score = 0
    for (const token of query) {
      const df = documentFrequency.get(token) ?? 0
      if (df === 0) {
        continue
      }
      const tf = doc.reduce((count, docToken) => count + (docToken === token ? 1 : 0), 0)
      if (tf === 0) {
        continue
      }
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5))
      score += (idf * tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + (BM25_B * doc.length) / averageLength))
    }
    if (score > 0) {
      ranked.push({ ...sentence, score })
    }
  }

  return ranked.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, topK)
}
