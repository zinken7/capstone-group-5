import { z } from 'zod'

/**
 * The job entry point for the FR-55 pipeline (design §5): the API will
 * enqueue a job per contribution event and a worker will run the pipeline
 * on it. Behind an interface like `ReportStore`, so the module stays
 * standalone — in-memory for tests now; the Postgres-backed queue (and any
 * API caller) is integration work.
 */

export const VERIFICATION_TRIGGERS = ['create', 'edit', 'manual'] as const
export type VerificationTrigger = (typeof VERIFICATION_TRIGGERS)[number]

export const verificationJobSchema = z.object({
  deploymentId: z.number().int().positive(),
  revisionId: z.number().int().positive(),
  trigger: z.enum(VERIFICATION_TRIGGERS),
})
export type VerificationJob = z.infer<typeof verificationJobSchema>

export interface VerificationQueue {
  send(job: VerificationJob): Promise<void>
}

export class InMemoryVerificationQueue implements VerificationQueue {
  readonly sent: VerificationJob[] = []

  send(job: VerificationJob): Promise<void> {
    this.sent.push(job)
    return Promise.resolve()
  }
}

/** Validates and sends; `unknown` because callers will hand over request-derived data. */
export async function enqueueVerification(queue: VerificationQueue, job: unknown): Promise<VerificationJob> {
  const parsed = verificationJobSchema.parse(job)
  await queue.send(parsed)
  return parsed
}
