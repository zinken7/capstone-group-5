import { buildAliasMap } from './retrieve.js'
import { loadAliasGroups } from './eval/aliases.js'
import { loadSmokeSet, smokeFetchedSource } from './eval/smoke.js'
import { runVerification } from './pipeline.js'
import { InMemoryReportStore } from './store.js'
import { HybridVerifier } from './verifier/hybrid.js'
import { LlmVerifier } from './verifier/llm.js'
import { NliScorer } from './verifier/nli.js'

/**
 * The manual trigger (design §9 MVP; the queue and API trigger are a
 * separate team decision). Runs the pipeline over one smoke item with the
 * stored page and the in-memory store, and prints the report the way the
 * review panel shows it (design §6 stage 7): field · sub-fact · verdict ·
 * quote · source, verdicts in words. With ANTHROPIC_API_KEY set the LLM
 * reviews routed claims; without it the run degrades per D6.
 *
 *   npm run verify -- --smoke wandarra-full-clean
 */

function usage(): never {
  const keys = loadSmokeSet()
    .map((item) => `  ${item.key}`)
    .join('\n')
  console.error(`usage: npm run verify -- --smoke <key>\n\nsmoke keys:\n${keys}`)
  process.exit(2)
}

const args = process.argv.slice(2)
const smokeFlag = args.indexOf('--smoke')
const key = smokeFlag === -1 ? undefined : args[smokeFlag + 1]
if (key === undefined) {
  usage()
}

const item = loadSmokeSet().find((candidate) => candidate.key === key)
if (item === undefined) {
  console.error(`unknown smoke key: ${key}\n`)
  usage()
}

const llm = new LlmVerifier()
const { report } = await runVerification(
  { submission: item.submission, evidenceUrl: item.evidenceUrl, freeText: null },
  {
    verifier: new HybridVerifier(new NliScorer(), llm),
    store: new InMemoryReportStore(),
    aliasMap: buildAliasMap(loadAliasGroups()),
    fetch: () => Promise.resolve(smokeFetchedSource(item)),
  },
)

const text = report.source?.extractedText ?? ''
const quoteOf = (start: number | null, end: number | null): string => {
  if (start === null || end === null) {
    return '—'
  }
  const quote = text.slice(start, end)
  return `"${quote.length > 72 ? `${quote.slice(0, 69)}…` : quote}"`
}

console.log(`report: ${item.key}`)
console.log(`spam gate: ${report.spamGateResult}`)
console.log(`recommendation: ${report.recommendation}`)
console.log(`basis: ${report.recommendationBasis}`)
console.log(`models: ${report.modelName ?? '—'}${report.promptVersion === null ? '' : ` (${report.promptVersion})`}${llm.available ? '' : ' — LLM unavailable, D6 degradation'}`)

if (Object.keys(report.fieldVerdicts).length > 0) {
  console.log('\nfield verdicts:')
  for (const [field, verdict] of Object.entries(report.fieldVerdicts)) {
    console.log(`  ${field.padEnd(14)} ${verdict.replace('_', ' ')}`)
  }
}

if (report.claims.length > 0) {
  console.log('\nclaims:')
  const sourceLabel = report.source?.archivedUrl ?? report.source?.url ?? '—'
  for (const claim of report.claims) {
    const name = `${claim.field}.${claim.subFact}${claim.subject === '' ? '' : ` (${claim.subject})`}`
    console.log(`  ${name.padEnd(42)} ${claim.verdict.padEnd(13)} ${quoteOf(claim.quoteStart, claim.quoteEnd)}`)
    if (claim.note !== null) {
      console.log(`  ${''.padEnd(42)} note: ${claim.note}`)
    }
  }
  console.log(`\nsource: ${sourceLabel}${report.source?.publishedDate == null ? '' : ` (published ${report.source.publishedDate})`}${report.source?.sourceClass == null ? '' : ` [${report.source.sourceClass}]`}`)
} else {
  console.log('\nno claims: the spam gate stopped the pipeline before any model ran')
}
