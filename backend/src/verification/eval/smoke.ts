import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import type { FetchedSource } from '../sources.js'

import { CLAIM_FIELDS, COMPANY_ROLES, EVIDENCE_TYPES, MACHINE_TYPES } from '../types.js'
import { VERDICTS } from '../verifier/types.js'

/**
 * The smoke set (design §7.1): twenty hand-labelled submissions. Pages are
 * stored text, not live fetches, so the harness is reproducible; the one
 * deliberate exception is the 403 item, whose URL is real and whose page is
 * null. Verdicts are the project manager's hand labels (2026-10-03), fixed
 * before any threshold tuning; the schema rejects an unlabelled expectation.
 */

const text = z.string().min(1)

/** Exported for the CLI's --file input, which shares the submission shape. */
export const submissionSchema = z.strictObject({
  site: z.strictObject({
    name: text,
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    region: text.nullable(),
  }),
  companyRoles: z.array(z.strictObject({ company: text, role: z.enum(COMPANY_ROLES) })),
  machine: z
    .strictObject({
      manufacturer: text.nullable(),
      machineType: z.enum(MACHINE_TYPES).nullable(),
      modelName: text.nullable(),
    })
    .nullable(),
  technology: z.strictObject({ supplier: text.nullable(), productName: text.nullable() }).nullable(),
  quantity: z.number().int().positive().nullable(),
  commissioning: z.strictObject({ year: z.number().int(), month: z.number().int().min(1).max(12).nullable() }).nullable(),
})

const expectationSchema = z.strictObject({
  field: z.enum(CLAIM_FIELDS),
  /** Matches SubFactClaim.subject; '' except for multi-instance fields. */
  subject: z.string().default(''),
  subFact: text,
  /**
   * A substring of the one sentence in storedText that answers this
   * sub-fact; null when the page holds no such sentence. Ground truth for
   * the stage-3 retrieval test.
   */
  sentence: text.nullable(),
  /** The project manager's hand label (design §7.1). */
  verdict: z.enum(VERDICTS),
})

const smokeItemSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  exercises: text,
  submission: submissionSchema,
  evidenceUrl: z.url(),
  /** The submission's free-text field; spam gate rule 4 reads it (links-only). */
  note: text.optional(),
  page: z
    .strictObject({
      storedText: text,
      publishedDate: z.iso.date().nullable(),
      sourceClass: z.enum(EVIDENCE_TYPES),
    })
    .nullable(),
  /** Text that must never appear in any retrieved candidate (the injection item). */
  mustNotRetrieve: text.optional(),
  expectations: z.array(expectationSchema),
})

export type SmokeItem = z.infer<typeof smokeItemSchema>
export type SmokeExpectation = z.infer<typeof expectationSchema>

export function loadSmokeSet(): SmokeItem[] {
  const path = fileURLToPath(new URL('./smoke-set.json', import.meta.url))
  return z.array(smokeItemSchema).parse(JSON.parse(readFileSync(path, 'utf8')))
}

/**
 * The item's stored page as stage 1 would have returned it, so the pipeline
 * runs offline and reproducibly over the smoke set (fetchedAt pinned). The
 * 403 item has no stored page and comes back as a fetch failure, which the
 * spam gate turns into unresolvable_url.
 */
export function smokeFetchedSource(item: SmokeItem): FetchedSource {
  if (item.page === null) {
    return {
      url: item.evidenceUrl,
      archivedUrl: null,
      httpStatus: 403,
      publishedDate: null,
      sourceClass: null,
      extractedText: null,
      textSha256: null,
      fetchedAt: new Date(0),
      failure: 'HTTP 403; stored smoke stand-in for the live fetch',
    }
  }
  return {
    url: item.evidenceUrl,
    archivedUrl: null,
    httpStatus: 200,
    publishedDate: item.page.publishedDate,
    sourceClass: item.page.sourceClass,
    extractedText: item.page.storedText,
    textSha256: createHash('sha256').update(item.page.storedText, 'utf8').digest('hex'),
    fetchedAt: new Date(0),
    failure: null,
  }
}
