import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import { loadAliasGroups } from './eval/aliases.js'
import { loadSmokeSet, smokeFetchedSource, submissionSchema } from './eval/smoke.js'
import { runVerification, type VerificationJob } from './pipeline.js'
import { buildAliasMap } from './retrieve.js'
import { InMemoryReportStore, type VerificationReport } from './store.js'
import { HybridVerifier } from './verifier/hybrid.js'
import { LlmVerifier } from './verifier/llm.js'
import { NliScorer } from './verifier/nli.js'

/**
 * The manual trigger (design §9 MVP; the queue and API trigger are a
 * separate team decision). Two modes, both printing the report the way the
 * review panel shows it (design §6 stage 7): field · sub-fact · verdict ·
 * quote · source, verdicts in words.
 *
 *   npm run verify -- --smoke <key>    a smoke item, stored page, offline
 *   npm run verify -- --file <path>    a submission JSON, live fetch
 *
 * The --file input is {submission, evidenceUrl, note?} — the submission in
 * the smoke set's shape, the note being the free-text field the spam gate
 * reads. See eval/examples/gudai-darri.json. With ANTHROPIC_API_KEY set
 * the LLM reviews routed claims; without it the run degrades per D6.
 */

// The repo-root .env, loaded the way config.ts loads it (ANTHROPIC_API_KEY
// for the LLM path); values already in the environment win.
const environmentFile = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile)
}

const fileSchema = z.strictObject({
  submission: submissionSchema,
  evidenceUrl: z.url(),
  /** The submission's free-text field; spam gate rule 4 reads it. */
  note: z.string().optional(),
})

function usage(): never {
  const keys = loadSmokeSet()
    .map((item) => `  ${item.key}`)
    .join('\n')
  console.error(
    `usage: npm run verify -- --smoke <key>\n       npm run verify -- --file <submission.json>\n\nsmoke keys:\n${keys}`,
  )
  process.exit(2)
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

interface CliRun {
  label: string
  job: VerificationJob
  /** Stored page for smoke items; undefined means the live stage-1 fetch. */
  fetch?: () => Promise<ReturnType<typeof smokeFetchedSource>>
}

function fromSmoke(key: string): CliRun {
  const item = loadSmokeSet().find((candidate) => candidate.key === key)
  if (item === undefined) {
    console.error(`unknown smoke key: ${key}\n`)
    usage()
  }
  return {
    label: item.key,
    job: { submission: item.submission, evidenceUrl: item.evidenceUrl, freeText: item.note ?? null },
    fetch: () => Promise.resolve(smokeFetchedSource(item)),
  }
}

function fromFile(path: string): CliRun {
  const parsed = fileSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')))
  if (!parsed.success) {
    console.error(`${path} is not a submission file:\n${z.prettifyError(parsed.error)}`)
    process.exit(2)
  }
  return {
    label: basename(path),
    job: {
      submission: parsed.data.submission,
      evidenceUrl: parsed.data.evidenceUrl,
      freeText: parsed.data.note ?? null,
    },
  }
}

const smokeKey = flag('--smoke')
const filePath = flag('--file')
if ((smokeKey === undefined) === (filePath === undefined)) {
  usage()
}
const run = smokeKey !== undefined ? fromSmoke(smokeKey) : fromFile(filePath as string)

const llm = new LlmVerifier()
const { report } = await runVerification(run.job, {
  verifier: new HybridVerifier(new NliScorer(), llm),
  store: new InMemoryReportStore(),
  aliasMap: buildAliasMap(loadAliasGroups()),
  ...(run.fetch === undefined ? {} : { fetch: run.fetch }),
})

printPanel(run.label, report, llm.available)

function printPanel(label: string, panelReport: VerificationReport, llmAvailable: boolean): void {
  const text = panelReport.source?.extractedText ?? ''
  const quoteOf = (start: number | null, end: number | null): string => {
    if (start === null || end === null) {
      return '—'
    }
    const quote = text.slice(start, end)
    return `"${quote.length > 72 ? `${quote.slice(0, 69)}…` : quote}"`
  }

  console.log(`report: ${label}`)
  console.log(`spam gate: ${panelReport.spamGateResult}`)
  console.log(`recommendation: ${panelReport.recommendation}`)
  console.log(`basis: ${panelReport.recommendationBasis}`)
  console.log(
    `models: ${panelReport.modelName ?? '—'}${panelReport.promptVersion === null ? '' : ` (${panelReport.promptVersion})`}${llmAvailable ? '' : ' — LLM unavailable, D6 degradation'}`,
  )

  if (Object.keys(panelReport.fieldVerdicts).length > 0) {
    console.log('\nfield verdicts:')
    for (const [field, verdict] of Object.entries(panelReport.fieldVerdicts)) {
      console.log(`  ${field.padEnd(14)} ${verdict.replace('_', ' ')}`)
    }
  }

  if (panelReport.claims.length > 0) {
    console.log('\nclaims:')
    for (const claim of panelReport.claims) {
      const name = `${claim.field}.${claim.subFact}${claim.subject === '' ? '' : ` (${claim.subject})`}`
      console.log(`  ${name.padEnd(42)} ${claim.verdict.padEnd(13)} ${quoteOf(claim.quoteStart, claim.quoteEnd)}`)
      if (claim.note !== null) {
        console.log(`  ${''.padEnd(42)} note: ${claim.note}`)
      }
    }
    const sourceLabel = panelReport.source?.archivedUrl ?? panelReport.source?.url ?? '—'
    console.log(
      `\nsource: ${sourceLabel}${panelReport.source?.publishedDate == null ? '' : ` (published ${panelReport.source.publishedDate})`}${panelReport.source?.sourceClass == null ? '' : ` [${panelReport.source.sourceClass}]`}`,
    )
  } else {
    console.log('\nno claims: the spam gate stopped the pipeline before any model ran')
  }
}
