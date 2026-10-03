import { describe, expect, it } from 'vitest'

import { LlmVerifier, type LlmTransport } from './llm.js'
import type { Candidate, VerifierResult } from './types.js'

/**
 * Design §9 step 4's acceptance test, deterministically: the transport
 * plays a model that invents spans, and the structural check must reject
 * every one — a span not in the stored source is never shown as
 * supporting evidence. The behaviour of the real model on the routed
 * smoke-set errors is llm.live.test.ts.
 */

const candidates: Candidate[] = [
  { index: 0, text: 'The processing plant was upgraded in 2018.', start: 0, end: 42 },
  { index: 1, text: 'Wandarra Iron runs 36 Caterpillar haul trucks.', start: 43, end: 89 },
]

const input = { hypothesis: 'The Wandarra Iron mine site operates haul trucks.', candidates, context: 'Wandarra Iron is a mine.' }

function stub(reply: string | (() => string)): LlmTransport {
  return {
    create: () => {
      const text = typeof reply === 'string' ? reply : reply()
      return Promise.resolve({ content: [{ type: 'text', text }] } as never)
    },
  }
}

function verify(reply: string): Promise<VerifierResult> {
  return new LlmVerifier({ transport: stub(reply) }).verify(input)
}

const json = (value: unknown): string => JSON.stringify(value)

describe('LlmVerifier structural span check (§9 step 4: an invented span must be rejected)', () => {
  it('rejects a candidate index that does not exist', async () => {
    const result = await verify(json({ verdict: 'supported', candidate_index: 7, start: 0, end: 10, note: 'invented' }))
    expect(result.verdict).toBe('insufficient')
    expect(result.note).toContain('span not found')
    expect(result.candidate_index).toBeNull()
  })

  it('rejects offsets that run past the candidate', async () => {
    const result = await verify(json({ verdict: 'supported', candidate_index: 1, start: 0, end: 500, note: null }))
    expect(result.verdict).toBe('insufficient')
    expect(result.note).toContain('span not found')
  })

  it('rejects a negative start and an empty span', async () => {
    for (const [start, end] of [
      [-3, 10],
      [10, 10],
      [20, 10],
    ]) {
      const result = await verify(json({ verdict: 'supported', candidate_index: 1, start, end, note: null }))
      expect(result.verdict).toBe('insufficient')
    }
  })

  it('rejects a supported verdict that cites no span at all', async () => {
    const result = await verify(json({ verdict: 'contradicted', candidate_index: null, start: null, end: null, note: null }))
    expect(result.verdict).toBe('insufficient')
    expect(result.note).toContain('span not found')
  })

  it('passes a verdict whose span is structurally inside a real candidate', async () => {
    const result = await verify(json({ verdict: 'supported', candidate_index: 1, start: 19, end: 45, note: 'states the fleet' }))
    expect(result).toEqual({
      verdict: 'supported',
      candidate_index: 1,
      start: 19,
      end: 45,
      score: null,
      note: 'states the fleet',
      path: 'llm',
    })
  })

  it('drops any span the model volunteers alongside an insufficient verdict', async () => {
    const result = await verify(json({ verdict: 'insufficient', candidate_index: 1, start: 0, end: 5, note: 'nothing here' }))
    expect(result).toMatchObject({ verdict: 'insufficient', candidate_index: null, start: null, end: null, note: 'nothing here' })
  })
})

describe('LlmVerifier output handling', () => {
  it('treats non-JSON output as insufficient', async () => {
    const result = await verify('The hypothesis is supported by candidate 1.')
    expect(result.verdict).toBe('insufficient')
    expect(result.note).toContain('malformed')
  })

  it('tolerates a fenced JSON answer', async () => {
    const result = await verify('```json\n{"verdict": "supported", "candidate_index": 1, "start": 0, "end": 10, "note": null}\n```')
    expect(result.verdict).toBe('supported')
  })

  it('reports a failed call as insufficient instead of throwing', async () => {
    const transport: LlmTransport = { create: () => Promise.reject(new Error('socket hang up')) }
    const result = await new LlmVerifier({ transport }).verify(input)
    expect(result.verdict).toBe('insufficient')
    expect(result.note).toContain('LLM call failed')
  })
})

describe('LlmVerifier availability (design §10 A.4.10)', () => {
  it('reports unavailable without a key and never throws', async () => {
    const verifier = new LlmVerifier({ apiKey: null })
    expect(verifier.available).toBe(false)
    await expect(verifier.verify(input)).resolves.toMatchObject({
      verdict: 'insufficient',
      note: 'LLM verifier unavailable: no API key',
      path: 'llm',
    })
  })

  it('skips the model entirely when there are no candidates', async () => {
    const transport: LlmTransport = {
      create: () => {
        throw new Error('must not be called')
      },
    }
    await expect(
      new LlmVerifier({ transport }).verify({ hypothesis: 'Anything.', candidates: [] }),
    ).resolves.toMatchObject({ verdict: 'insufficient', note: 'no candidate sentences to judge' })
  })
})
