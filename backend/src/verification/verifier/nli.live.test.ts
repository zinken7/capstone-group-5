import { describe, expect, it } from 'vitest'

import { NliScorer, NliVerifier } from './nli.js'

/**
 * Model-dependent half of build step 3's test. Downloads the NLI weights on
 * first run (~223 MB into the transformers.js cache), so it is opt-in:
 *
 *   LIVE_NLI=1 npm test -- src/verification/verifier/nli.live.test.ts
 *
 * The default `npm test` run skips this file and stays deterministic.
 */

describe.runIf(process.env.LIVE_NLI === '1')('NliVerifier on real model scores', () => {
  const scorer = new NliScorer()
  const verifier = new NliVerifier(scorer)

  const candidates = [
    { index: 0, text: 'The processing plant was upgraded in 2018.', start: 0, end: 42 },
    { index: 1, text: 'Wandarra Iron runs a fleet of 36 autonomous Caterpillar 793F haul trucks.', start: 43, end: 117 },
  ]

  it('scores an entailed pair far above a neutral one', { timeout: 300_000 }, async () => {
    const scores = await scorer.scoreMany(
      candidates.map((candidate) => candidate.text),
      'The Wandarra Iron mine site operates haul trucks.',
    )
    expect(scores[1]!.entailment).toBeGreaterThan(0.8)
    expect(scores[1]!.entailment).toBeGreaterThan(scores[0]!.entailment)
  })

  it('supports a hypothesis the page states, citing the whole sentence', { timeout: 300_000 }, async () => {
    const result = await verifier.verify({
      hypothesis: 'The Wandarra Iron mine site operates Caterpillar machines.',
      candidates,
    })
    expect(result.verdict).toBe('supported')
    expect(result.candidate_index).toBe(1)
    expect(result.start).toBe(0)
    expect(result.end).toBe(candidates[1]!.text.length)
    expect(result.path).toBe('nli')
  })

  it('contradicts an explicitly different value', { timeout: 300_000 }, async () => {
    const result = await verifier.verify({
      hypothesis: 'The Wandarra Iron mine site operates Komatsu haul trucks.',
      candidates,
    })
    expect(result.verdict).toBe('contradicted')
    expect(result.candidate_index).toBe(1)
  })
})
