import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SUB_FACT_TABLE, decompose } from '../decompose.js'
import { buildAliasMap, retrieve, splitSentences } from '../retrieve.js'
import { DEFAULT_NLI_MODEL_ID, NliScorer, buildPremise, decideVerdict, type NliScores, type NliThresholds } from '../verifier/nli.js'
import { VERDICTS, type Verdict } from '../verifier/types.js'
import { loadAliasGroups } from './aliases.js'
import { loadSmokeSet } from './smoke.js'

/**
 * Design §9 build step 3's harness: scores every (candidate, hypothesis)
 * pair the pipeline produces from the smoke set, sweeps the two §4.2
 * thresholds against the hand labels, and reports the §7.2 metrics for the
 * chosen pair. SMOKE_SET_THRESHOLDS in verifier/nli.ts is maintained by
 * hand from this harness's output, so the shipped rule is the measured one.
 *
 * Run (downloads the model on first use):
 *   NLI_EVAL_CACHE=/tmp/nli-scores.json npx tsx src/verification/eval/nli-eval.ts
 */

/** Matches the stage-2 retrieval test: the right sentence is guaranteed in the top three. */
const TOP_K = 3

interface EvalRow {
  item: string
  field: string
  subject: string
  subFact: string
  label: Verdict
  hypothesis: string
  /** Candidate sentences in retrieval order; empty when the page is null or retrieval found nothing. */
  premises: string[]
  scores: NliScores[]
}

function claimKey(claim: { field: string; subject: string; subFact: string }): string {
  return `${claim.field}/${claim.subject}/${claim.subFact}`
}

/** `withContext` prepends the page's lead sentence to each premise, as NliVerifier does (§4.4 amendment). */
export function buildRows(withContext: boolean): EvalRow[] {
  const aliasMap = buildAliasMap(loadAliasGroups())
  const rows: EvalRow[] = []

  for (const item of loadSmokeSet()) {
    const claims = new Map(decompose(item.submission).map((claim) => [claimKey(claim), claim]))
    const sentences = item.page === null ? [] : splitSentences(item.page.storedText)
    const context = withContext ? (sentences[0]?.text ?? null) : null

    for (const expectation of item.expectations) {
      const claim = claims.get(claimKey(expectation))
      if (claim === undefined) {
        throw new Error(`${item.key}: no decomposed claim for ${claimKey(expectation)}`)
      }
      const candidates = item.page === null ? [] : retrieve(claim.terms, sentences, { aliasMap, topK: TOP_K })
      rows.push({
        item: item.key,
        field: expectation.field,
        subject: expectation.subject,
        subFact: expectation.subFact,
        label: expectation.verdict,
        hypothesis: claim.hypothesis,
        premises: candidates.map((candidate) => buildPremise(context, candidate.text)),
        scores: [],
      })
    }
  }

  return rows
}

type ScoreCache = Record<string, NliScores[]>

function cacheKey(modelId: string, dtype: string, row: EvalRow): string {
  return createHash('sha256').update(JSON.stringify([modelId, dtype, row.hypothesis, row.premises])).digest('hex')
}

/** Fills row.scores, through the JSON score cache at NLI_EVAL_CACHE when set. */
export async function scoreRows(rows: EvalRow[], scorer: NliScorer, modelId: string, dtype: string): Promise<void> {
  const cachePath = process.env.NLI_EVAL_CACHE
  const cache: ScoreCache =
    cachePath !== undefined && existsSync(cachePath) ? (JSON.parse(readFileSync(cachePath, 'utf8')) as ScoreCache) : {}

  let scored = 0
  for (const row of rows) {
    if (row.premises.length === 0) {
      continue
    }
    const key = cacheKey(modelId, dtype, row)
    const hit = cache[key]
    if (hit !== undefined) {
      row.scores = hit
      continue
    }
    row.scores = await scorer.scoreMany(row.premises, row.hypothesis)
    cache[key] = row.scores
    scored += 1
  }

  if (cachePath !== undefined && scored > 0) {
    mkdirSync(dirname(cachePath), { recursive: true })
    writeFileSync(cachePath, JSON.stringify(cache))
  }
}

export function predict(row: EvalRow, thresholds: NliThresholds): Verdict {
  return row.premises.length === 0 ? 'insufficient' : decideVerdict(row.scores, thresholds).verdict
}

type Confusion = Record<Verdict, Record<Verdict, number>>

function emptyConfusion(): Confusion {
  const matrix = {} as Confusion
  for (const label of VERDICTS) {
    matrix[label] = { supported: 0, contradicted: 0, insufficient: 0 }
  }
  return matrix
}

export function confusion(rows: readonly EvalRow[], thresholds: NliThresholds): Confusion {
  const matrix = emptyConfusion()
  for (const row of rows) {
    matrix[row.label][predict(row, thresholds)] += 1
  }
  return matrix
}

function classF1(matrix: Confusion, verdict: Verdict): number {
  const tp = matrix[verdict][verdict]
  const predicted = VERDICTS.reduce((sum, label) => sum + matrix[label][verdict], 0)
  const labelled = VERDICTS.reduce((sum, label) => sum + matrix[verdict][label], 0)
  if (tp === 0) {
    return 0
  }
  const precision = tp / predicted
  const recall = tp / labelled
  return (2 * precision * recall) / (precision + recall)
}

export function macroF1(matrix: Confusion): number {
  return VERDICTS.reduce((sum, verdict) => sum + classF1(matrix, verdict), 0) / VERDICTS.length
}

function supportedPrecision(matrix: Confusion): number {
  const predicted = VERDICTS.reduce((sum, label) => sum + matrix[label].supported, 0)
  return predicted === 0 ? 0 : matrix.supported.supported / predicted
}

export interface SweepResult {
  thresholds: NliThresholds
  macroF1: number
}

/**
 * Grid-searches both thresholds at 0.01 steps for the best macro-F1 over
 * the three verdict classes; ties break towards higher supported precision,
 * then higher (more conservative) thresholds.
 */
export function sweep(rows: readonly EvalRow[]): SweepResult {
  let best: { thresholds: NliThresholds; macroF1: number; supportedPrecision: number } | null = null

  for (let ts = 1; ts <= 99; ts += 1) {
    for (let tc = 1; tc <= 99; tc += 1) {
      const thresholds = { supported: ts / 100, contradicted: tc / 100 }
      const matrix = confusion(rows, thresholds)
      const score = macroF1(matrix)
      const precision = supportedPrecision(matrix)
      if (
        best === null ||
        score > best.macroF1 ||
        (score === best.macroF1 &&
          (precision > best.supportedPrecision ||
            (precision === best.supportedPrecision &&
              (thresholds.supported > best.thresholds.supported ||
                (thresholds.supported === best.thresholds.supported &&
                  thresholds.contradicted > best.thresholds.contradicted)))))
      ) {
        best = { thresholds, macroF1: score, supportedPrecision: precision }
      }
    }
  }

  if (best === null) {
    throw new Error('empty sweep')
  }
  return { thresholds: best.thresholds, macroF1: best.macroF1 }
}

function ratio(numerator: number, denominator: number): string {
  return denominator === 0 ? 'n/a' : `${numerator}/${denominator} = ${(numerator / denominator).toFixed(2)}`
}

export function report(rows: readonly EvalRow[], thresholds: NliThresholds): string {
  const lines: string[] = []
  const matrix = confusion(rows, thresholds)

  lines.push(`thresholds: supported >= ${thresholds.supported}, contradicted >= ${thresholds.contradicted}`)
  lines.push(`macro-F1: ${macroF1(matrix).toFixed(3)} over ${rows.length} labelled sub-fact expectations`)
  lines.push('')
  lines.push('| label \\ predicted | supported | contradicted | insufficient |')
  lines.push('|---|---|---|---|')
  for (const label of VERDICTS) {
    lines.push(`| ${label} | ${matrix[label].supported} | ${matrix[label].contradicted} | ${matrix[label].insufficient} |`)
  }

  lines.push('')
  lines.push('| sub-fact | n | supported P | supported R | contradicted P |')
  lines.push('|---|---|---|---|---|')
  for (const spec of SUB_FACT_TABLE) {
    const subset = rows.filter((row) => row.field === spec.field && row.subFact === spec.subFact)
    if (subset.length === 0) {
      continue
    }
    const predictions = subset.map((row) => ({ label: row.label, predicted: predict(row, thresholds) }))
    const supportedTp = predictions.filter((p) => p.label === 'supported' && p.predicted === 'supported').length
    const supportedPredicted = predictions.filter((p) => p.predicted === 'supported').length
    const supportedLabelled = predictions.filter((p) => p.label === 'supported').length
    const contraTp = predictions.filter((p) => p.label === 'contradicted' && p.predicted === 'contradicted').length
    const contraPredicted = predictions.filter((p) => p.predicted === 'contradicted').length
    lines.push(
      `| ${spec.field}.${spec.subFact} | ${subset.length} | ${ratio(supportedTp, supportedPredicted)} | ${ratio(
        supportedTp,
        supportedLabelled,
      )} | ${ratio(contraTp, contraPredicted)} |`,
    )
  }

  const errors = rows.filter((row) => predict(row, thresholds) !== row.label)
  lines.push('')
  lines.push(`errors: ${errors.length}`)
  for (const row of errors) {
    const decision = row.premises.length === 0 ? null : decideVerdict(row.scores, thresholds)
    lines.push(
      `- ${row.item} ${row.field}.${row.subFact}${row.subject === '' ? '' : ` (${row.subject})`}: labelled ${row.label}, predicted ${predict(row, thresholds)}${decision === null ? ' (no candidates)' : ` (score ${decision.score.toFixed(3)})`}`,
    )
  }

  return lines.join('\n')
}

async function main(): Promise<void> {
  const modelId = process.env.NLI_EVAL_MODEL ?? DEFAULT_NLI_MODEL_ID
  const dtype = process.env.NLI_EVAL_DTYPE === 'fp32' ? 'fp32' : 'q8'
  const withContext = process.env.NLI_EVAL_CONTEXT !== '0'
  const rows = buildRows(withContext)
  const pairs = rows.reduce((sum, row) => sum + row.premises.length, 0)
  console.log(
    `${rows.length} expectations, ${pairs} (candidate, hypothesis) pairs, model ${modelId} (${dtype}), lead-sentence context ${withContext ? 'on' : 'off'}`,
  )

  await scoreRows(rows, new NliScorer({ modelId, dtype }), modelId, dtype)
  const { thresholds } = sweep(rows)
  console.log('')
  console.log(report(rows, thresholds))
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main()
}
