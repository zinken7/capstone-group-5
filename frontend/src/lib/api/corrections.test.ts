import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CorrectionApiError, submitCorrection } from './corrections'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', '/api')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('correction API client', () => {
  it('reports a correction to a verified record as a proposal waiting for review', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 10, correction_id: 4, verification_status: 'verified', key: 'k'.repeat(43) }, { status: 202 }))

    // The key lets this browser follow the proposal (#223)
    await expect(submitCorrection(10, { quantity: 3, disclosureAccepted: true })).resolves.toEqual({ id: 10, correctionId: 4, verificationStatus: 'verified', key: 'k'.repeat(43) })
  })

  it('serializes the public correction contract', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 12, verification_status: 'pending_review' }))

    await submitCorrection(12, {
      quantity: 3,
      deploymentStatus: 'operational',
      evidenceUrls: ['https://example.com/source'],
      changeNote: 'Updated fleet count',
      disclosureAccepted: true,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/deployments/12', expect.objectContaining({ method: 'PATCH' }))
    const init = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(init?.body))).toEqual(expect.objectContaining({
      quantity: 3,
      deployment_status: 'operational',
      evidence_urls: ['https://example.com/source'],
      change_note: 'Updated fleet count',
      disclosure_accepted: true,
    }))
  })

  it('keeps field-level validation errors from the API', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'invalid correction', fields: { quantity: 'must be positive' } }, { status: 400 }))

    await expect(submitCorrection(12, { disclosureAccepted: true })).rejects.toMatchObject({
      message: 'invalid correction',
      fields: { quantity: 'must be positive' },
    } satisfies Partial<CorrectionApiError>)
  })
})
