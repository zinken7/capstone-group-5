import { describe, expect, it } from 'vitest'

import { InMemoryVerificationQueue, enqueueVerification } from './queue.js'

const job = { deploymentId: 7, revisionId: 12, trigger: 'create' as const }

describe('enqueueVerification', () => {
  it('validates and sends a well-formed job', async () => {
    const queue = new InMemoryVerificationQueue()
    const parsed = await enqueueVerification(queue, job)
    expect(parsed).toEqual(job)
    expect(queue.sent).toEqual([job])
  })

  it('accepts every trigger', async () => {
    const queue = new InMemoryVerificationQueue()
    await enqueueVerification(queue, { ...job, trigger: 'edit' })
    await enqueueVerification(queue, { ...job, trigger: 'manual' })
    expect(queue.sent.map((sent) => sent.trigger)).toEqual(['edit', 'manual'])
  })

  it('rejects an unknown trigger without sending', async () => {
    const queue = new InMemoryVerificationQueue()
    await expect(enqueueVerification(queue, { ...job, trigger: 'cron' })).rejects.toThrow()
    expect(queue.sent).toEqual([])
  })

  it.each([
    ['missing revisionId', { deploymentId: 7, trigger: 'create' }],
    ['non-integer deploymentId', { ...job, deploymentId: 7.5 }],
    ['non-positive deploymentId', { ...job, deploymentId: 0 }],
    ['string ids', { ...job, revisionId: '12' }],
  ])('rejects %s', async (_name, bad) => {
    const queue = new InMemoryVerificationQueue()
    await expect(enqueueVerification(queue, bad)).rejects.toThrow()
    expect(queue.sent).toEqual([])
  })

  it('strips unknown keys before sending', async () => {
    const queue = new InMemoryVerificationQueue()
    await enqueueVerification(queue, { ...job, extra: 'ignored' })
    expect(queue.sent[0]).toEqual(job)
  })
})
