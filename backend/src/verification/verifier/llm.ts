import { readFileSync } from 'node:fs'

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

import { VERDICTS, type Candidate, type Verifier, type VerifierInput, type VerifierResult } from './types.js'

/**
 * Stage 4, LLM branch (design §4.2, §9 step 4): Claude judges the routed
 * sub-facts the NLI scorer gets wrong — context-only support, cross-script
 * aliases, hedged non-evidence — and writes the reviewer note. The model
 * returns a candidate index plus character offsets, never free text, and
 * the structural check below rejects anything that does not land inside a
 * real candidate: an invented span becomes *insufficient*, by construction
 * (R1). Per D3 as amended, the model only answers "explicitly different
 * value?"; date comparison lives in aggregation.
 *
 * The prompt is ../prompts/verify-claim.v1.md, versioned in the repo
 * (§9 MVP scope) and read from source at runtime — the module runs under
 * tsx; a dist build would need the prompts directory copied.
 */

export const LLM_MODEL_ID = 'claude-haiku-4-5'
export const PROMPT_VERSION = 'verify-claim.v1'

// The hybrid treats these notes as "the LLM did not actually review this
// claim" and falls back to the NLI verdict under D6.
export const LLM_UNAVAILABLE_NOTE = 'LLM verifier unavailable: no API key'
export const LLM_FAILURE_NOTE_PREFIX = 'LLM call failed'

const promptPath = new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url)

/** What the model must return; unknown keys are stripped, anything else is rejected and becomes insufficient. */
const llmOutputSchema = z.object({
  verdict: z.enum(VERDICTS),
  candidate_index: z.number().int().nullable(),
  start: z.number().int().nullable(),
  end: z.number().int().nullable(),
  note: z.string().nullable(),
})

/** The one SDK call the verifier makes; injectable so tests can play a model that invents spans. */
export interface LlmTransport {
  create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>
}

export interface LlmVerifierOptions {
  /** undefined → ANTHROPIC_API_KEY from the environment; null → force unavailable. */
  apiKey?: string | null
  model?: string
  /** Test seam; when given, the verifier is available without a key. */
  transport?: LlmTransport
}

function insufficient(note: string): VerifierResult {
  return { verdict: 'insufficient', candidate_index: null, start: null, end: null, score: null, note, path: 'llm' }
}

/** Fails with a reason when the cited span is not structurally inside a real candidate (design §4.2's check). */
function spanFailure(output: z.infer<typeof llmOutputSchema>, candidates: readonly Candidate[]): string | null {
  const { candidate_index: index, start, end } = output
  if (index === null || start === null || end === null) {
    return 'verdict cites no span'
  }
  const cited = candidates[index]
  if (index < 0 || cited === undefined) {
    return `candidate ${index} does not exist`
  }
  if (start < 0 || end > cited.text.length || start >= end) {
    return `offsets [${start}, ${end}) fall outside candidate ${index}`
  }
  return null
}

export class LlmVerifier implements Verifier {
  private readonly apiKey: string | null
  private readonly model: string
  private transport: LlmTransport | null
  private prompt: string | null = null

  constructor(options: LlmVerifierOptions = {}) {
    this.apiKey = options.apiKey === undefined ? (process.env.ANTHROPIC_API_KEY ?? null) : options.apiKey
    this.model = options.model ?? LLM_MODEL_ID
    this.transport = options.transport ?? null
  }

  /** False without a key (design §10 A.4.10): verify() then reports, never throws. */
  get available(): boolean {
    return this.transport !== null || this.apiKey !== null
  }

  async verify({ hypothesis, candidates, context }: VerifierInput): Promise<VerifierResult> {
    if (!this.available) {
      return insufficient(LLM_UNAVAILABLE_NOTE)
    }
    if (candidates.length === 0) {
      return insufficient('no candidate sentences to judge')
    }

    let response: Anthropic.Message
    try {
      response = await this.send(hypothesis, candidates, context ?? null)
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        return insufficient(`${LLM_FAILURE_NOTE_PREFIX}: rate limited`)
      }
      if (error instanceof Anthropic.APIError) {
        return insufficient(`${LLM_FAILURE_NOTE_PREFIX}: API error ${error.status ?? 'unknown'}`)
      }
      return insufficient(`${LLM_FAILURE_NOTE_PREFIX}: ${error instanceof Error ? error.message : 'unknown error'}`)
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
    const output = parseOutput(text)
    if (output === null) {
      return insufficient('malformed LLM output: not the required JSON object')
    }

    if (output.verdict === 'insufficient') {
      // Any span the model volunteered is dropped: insufficient cites nothing.
      return insufficient(output.note ?? 'LLM found no sufficient evidence')
    }

    const failure = spanFailure(output, candidates)
    if (failure !== null) {
      return insufficient(`span not found: ${failure}`)
    }
    return {
      verdict: output.verdict,
      candidate_index: output.candidate_index,
      start: output.start,
      end: output.end,
      score: null,
      note: output.note,
      path: 'llm',
    }
  }

  private async send(hypothesis: string, candidates: readonly Candidate[], context: string | null): Promise<Anthropic.Message> {
    this.prompt ??= readFileSync(promptPath, 'utf8')
    this.transport ??= buildSdkTransport(this.apiKey)

    const numbered = candidates.map((candidate, index) => `${index}: ${candidate.text}`).join('\n')
    const user = [
      `<hypothesis>${hypothesis}</hypothesis>`,
      `<page_lead>${context ?? ''}</page_lead>`,
      `<candidates>\n${numbered}\n</candidates>`,
    ].join('\n')

    return this.transport.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0, // design §8: same inputs, same report
      system: this.prompt,
      messages: [{ role: 'user', content: user }],
    })
  }
}

function buildSdkTransport(apiKey: string | null): LlmTransport {
  const client = new Anthropic({ apiKey: apiKey ?? undefined })
  return { create: (params) => client.messages.create(params) }
}

function parseOutput(text: string): z.infer<typeof llmOutputSchema> | null {
  // Tolerate a fenced answer; everything else must be the bare JSON object.
  const bare = text
    .trim()
    .replace(/^```(?:json)?\s*/u, '')
    .replace(/\s*```$/u, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(bare)
  } catch {
    return null
  }
  const result = llmOutputSchema.safeParse(parsed)
  return result.success ? result.data : null
}
