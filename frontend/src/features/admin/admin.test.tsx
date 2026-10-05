import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import App from '../../App'
import { buildCorrection } from './components/CorrectionForm'
import type { ReviewRecord } from './types'

type Handler = (body: unknown) => Response
interface Call { key: string; body: unknown; headers: Headers }

/** Stubs fetch with handlers keyed by "METHOD /path"; unknown requests fail loudly. */
function stubApi(routes: Record<string, Handler | Handler[]>): Call[] {
  const calls: Call[] = []
  const queues = new Map(Object.entries(routes).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]))
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ key, body, headers: new Headers(init?.headers) })
    const entry = queues.get(key)
    const handler = Array.isArray(entry) ? (entry.length > 1 ? entry.shift() : entry[0]) : entry
    return handler ? handler(body) : Response.json({ error: `unexpected request ${key}` }, { status: 500 })
  }))
  return calls
}

const profile = (mustChange = false) => Response.json({ email: 'reviewer@example.com', role: 'admin', must_change_password: mustChange })
const unauthorised = () => Response.json({ error: 'sign in required' }, { status: 401 })

const recordDto = (overrides: Record<string, unknown> = {}) => ({
  id: 12,
  verification_status: 'pending_review',
  site_id: 3,
  site_name: 'Kalgoorlie Super Pit',
  country_code: 'AU',
  region: 'Goldfields',
  commodity: 'gold',
  machine_manufacturer: 'Sandvik',
  machine_model: 'LH517i',
  model_variant: null,
  machine_type: 'lhd',
  quantity: 8,
  technology_supplier: 'Sandvik',
  technology_product: 'AutoMine',
  automation_level: 'semi_autonomous',
  environment: 'underground',
  installation_type: 'unknown',
  status: 'announced',
  commissioning_date: null,
  commissioning_year: 2024,
  valid_from: '2024-01-01',
  valid_to: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-02T00:00:00Z',
  evidence: [{ url: 'https://example.com/evidence/12', source_type: 'news', publisher: null, published_date: null }],
  reviews: [],
  revisions: [],
  ...overrides,
})

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('administration access', () => {
  test('sends a visitor without a session to the sign-in page', async () => {
    stubApi({ 'GET /api/admin/session': unauthorised })
    renderAt('/admin')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  test('shows a generic error for wrong credentials', async () => {
    stubApi({ 'POST /api/admin/session': () => Response.json({ error: 'incorrect email or password' }, { status: 401 }) })
    const user = userEvent.setup()
    renderAt('/admin/login')

    await user.type(screen.getByLabelText('Email'), 'reviewer@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
  })

  test('makes a new administrator replace the temporary password before reaching the queue', async () => {
    const calls = stubApi({
      'POST /api/admin/session': () => profile(true),
      'POST /api/admin/password': () => profile(false),
      'GET /api/admin/reviews': () => Response.json({ items: [] }),
    })
    const user = userEvent.setup()
    renderAt('/admin/login')

    await user.type(screen.getByLabelText('Email'), 'reviewer@example.com')
    await user.type(screen.getByLabelText('Password'), 'temporary-pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText(/signed in with a temporary password/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Review queue' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Temporary password'), 'temporary-pass')
    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm new password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('at least 12 characters')

    await user.clear(screen.getByLabelText('New password'))
    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('New password'), 'a much longer password')
    await user.type(screen.getByLabelText('Confirm new password'), 'a much longer password')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    expect(await screen.findByText('Nothing to review')).toBeInTheDocument()
    const passwordCall = calls.find((call) => call.key === 'POST /api/admin/password')
    expect(passwordCall?.body).toEqual({ current_password: 'temporary-pass', new_password: 'a much longer password' })
    expect(passwordCall?.headers.get('X-Requested-With')).toBe('fetch')
  })

  test('signs out and returns to the sign-in page', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({ items: [] }),
      'DELETE /api/admin/session': () => new Response(null, { status: 204 }),
    })
    const user = userEvent.setup()
    renderAt('/admin')

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'DELETE /api/admin/session')).toBe(true)
  })

  test('returns to sign-in when the session ends while loading the queue', async () => {
    stubApi({ 'GET /api/admin/session': () => profile(), 'GET /api/admin/reviews': unauthorised })
    renderAt('/admin')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('review queue', () => {
  test('lists pending records with a link to each, and flags missing evidence', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({
        items: [{
          id: 12, site_name: 'Kalgoorlie Super Pit', country_code: 'AU', region: 'Goldfields',
          machine_manufacturer: 'Sandvik', machine_model: 'LH517i', machine_type: 'lhd', quantity: 8,
          technology_supplier: null, technology_product: null, evidence_count: 0, submitted_at: '2026-10-02T00:00:00Z',
        }],
      }),
    })
    renderAt('/admin')

    const row = (await screen.findByText('Kalgoorlie Super Pit')).closest('tr')
    if (!row) throw new Error('no row')
    expect(within(row).getByText('Sandvik LH517i')).toBeInTheDocument()
    expect(within(row).getByText('None')).toBeInTheDocument()
    expect(within(row).getByText('Not recorded')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /review kalgoorlie super pit record 12/i })).toHaveAttribute('href', '/admin/deployments/12')
  })
})

describe('record review', () => {
  test('shows the record, opens evidence safely, and records a rejection with a note', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': [
        () => Response.json(recordDto()),
        () => Response.json(recordDto({
          verification_status: 'rejected',
          reviews: [{ decision: 'rejected', note: 'Duplicate', administrator: 'reviewer@example.com', reviewed_at: '2026-10-05T01:00:00Z' }],
        })),
      ],
      'POST /api/admin/deployments/12/reviews': () => Response.json({ id: 1, verification_status: 'rejected' }, { status: 201 }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/12')

    expect(await screen.findByRole('heading', { name: 'Kalgoorlie Super Pit' })).toBeInTheDocument()
    expect(screen.getByText('Pending review')).toBeInTheDocument()
    const evidence = screen.getByRole('link', { name: 'https://example.com/evidence/12' })
    expect(evidence).toHaveAttribute('target', '_blank')
    expect(evidence).toHaveAttribute('rel', 'noopener noreferrer')

    await user.click(screen.getByLabelText(/^Reject/))
    await user.click(screen.getByRole('button', { name: 'Record decision' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Add a note')

    await user.type(screen.getByLabelText(/Note \(required\)/), 'Duplicate')
    await user.click(screen.getByRole('button', { name: 'Record decision' }))

    expect(await screen.findByText('Decision recorded.')).toBeInTheDocument()
    expect(screen.getByText('Rejected', { selector: '.status-badge' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument()
    expect(screen.getByText(/by reviewer@example.com/)).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /api/admin/deployments/12/reviews')?.body).toEqual({ decision: 'rejected', note: 'Duplicate' })
  })

  test('shows why an approval was refused', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({ evidence: [] })),
      'POST /api/admin/deployments/12/reviews': () => Response.json(
        { error: 'at least one evidence URL is required before the record can be verified' }, { status: 409 }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/12')

    expect(await screen.findByText(/No evidence supplied/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Record decision' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('at least one evidence URL is required')
  })

  test('saves a correction with only the changed fields and shows it in the history', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': [
        () => Response.json(recordDto()),
        () => Response.json(recordDto({
          quantity: 9,
          revisions: [{
            action: 'update', previous_values: { quantity: 8 }, change_note: 'Updated fleet count',
            contributor_email: null, contributor_organisation: null, administrator: 'reviewer@example.com',
            changed_at: '2026-10-05T02:00:00Z',
          }],
        })),
      ],
      'PATCH /api/admin/deployments/12': () => Response.json({ id: 12, verification_status: 'pending_review' }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/12')

    const quantity = await screen.findByLabelText('Quantity')
    await user.clear(quantity)
    await user.type(quantity, '9')
    await user.type(screen.getByLabelText('Change note (optional)'), 'Updated fleet count')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    expect(await screen.findByText('Correction saved.')).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'PATCH /api/admin/deployments/12')?.body).toEqual({ quantity: 9, change_note: 'Updated fleet count' })
    expect(screen.getByText(/Corrected/)).toBeInTheDocument()
    expect(screen.getByText('Previous quantity')).toBeInTheDocument()
  })

  test('says when a record does not exist', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/999': () => Response.json({ error: 'deployment not found' }, { status: 404 }),
    })
    renderAt('/admin/deployments/999')
    expect(await screen.findByText('Record not found')).toBeInTheDocument()
  })
})

describe('buildCorrection', () => {
  const record = {
    id: 12, verificationStatus: 'pending_review', siteName: 'S', countryCode: 'AU', region: null, commodity: null,
    machineManufacturer: 'M', machineModel: null, modelVariant: null, machineType: 'lhd', quantity: 8,
    technologySupplier: null, technologyProduct: null, automationLevel: null, environment: null,
    installationType: 'unknown', status: null, commissioningDate: null, commissioningYear: null,
    validFrom: null, validTo: null, evidence: [], reviews: [], revisions: [],
  } satisfies ReviewRecord
  const unchanged = {
    quantity: '8', environment: '', deploymentStatus: '', automationLevel: '', installationType: 'unknown',
    commissioningDate: '', technologySupplier: '', technologyProduct: '', evidenceUrl: '', changeNote: '',
  }

  test('asks for a change when nothing differs', () => {
    expect(buildCorrection(record, unchanged)).toBe('Change at least one field or add evidence.')
  })

  test('requires the supplier and product together', () => {
    expect(buildCorrection(record, { ...unchanged, technologySupplier: 'RCT' })).toBe('Enter both the technology supplier and the product.')
  })

  test('rejects an invalid quantity or evidence URL', () => {
    expect(buildCorrection(record, { ...unchanged, quantity: '0' })).toBe('Quantity must be a positive whole number.')
    expect(buildCorrection(record, { ...unchanged, evidenceUrl: 'ftp://x' })).toBe('Evidence must be an http or https URL.')
  })

  test('collects the technology and a new evidence URL', () => {
    expect(buildCorrection(record, {
      ...unchanged, technologySupplier: 'RCT', technologyProduct: 'ControlMaster', evidenceUrl: 'https://example.com/a',
    })).toEqual({ technologySupplier: 'RCT', technologyProduct: 'ControlMaster', evidenceUrls: ['https://example.com/a'] })
  })
})

describe('public navigation', () => {
  test('does not link to administration', () => {
    stubApi({})
    renderAt('/contribute')
    const navigation = screen.getByRole('navigation', { name: /primary navigation/i })
    expect(within(navigation).queryByText(/admin/i)).not.toBeInTheDocument()
  })
})
