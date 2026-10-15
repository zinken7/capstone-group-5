import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import App from '../../App'
import { stubApi } from '../../test/stub-api'
import { buildCorrection } from './components/CorrectionForm'
import type { ReviewRecord } from './types'

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
  latitude: -30.78,
  longitude: 121.5,
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
  possible_duplicates: [],
  reviews: [],
  revisions: [],
  corrections: [],
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

  test('ticks off the password rules while the new password is typed', async () => {
    stubApi({ 'GET /api/admin/session': () => profile(true) })
    const user = userEvent.setup()
    renderAt('/admin/password')

    const rules = await screen.findByRole('list', { name: 'Password requirements' })
    expect(within(rules).getByText(/At least 12 characters/)).toHaveTextContent('(not yet)')

    await user.type(screen.getByLabelText('Temporary password'), 'temporary-pass')
    await user.type(screen.getByLabelText('New password'), 'a-much-longer-password')
    await user.type(screen.getByLabelText('Confirm new password'), 'a-much-longer-password')

    expect(within(rules).getAllByText(/\(done\)/)).toHaveLength(3)
    await user.click(screen.getByLabelText('Show passwords'))
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'text')
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

  test('signs out and returns to the public page this tab came from, not to sign-in', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({ items: [] }),
      'DELETE /api/admin/session': () => new Response(null, { status: 204 }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    window.sessionStorage.setItem('mining-market-map.admin-return-to', '/contribute')
    const user = userEvent.setup()
    renderAt('/admin')

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Contribute', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByText('Signed in as administrator')).not.toBeInTheDocument()
    expect(calls.some((call) => call.key === 'DELETE /api/admin/session')).toBe(true)
  })

  test('signs out to the map when this tab came straight to administration', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({ items: [] }),
      'DELETE /api/admin/session': () => new Response(null, { status: 204 }),
    })
    const user = userEvent.setup()
    renderAt('/admin')

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  test('shows a signed-in administrator on public pages, with a way back and out', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
      'DELETE /api/admin/session': () => new Response(null, { status: 204 }),
    })
    window.localStorage.setItem('mining-market-map.admin-signed-in', '1')
    const user = userEvent.setup()
    renderAt('/contribute')

    expect(await screen.findByText('Signed in as administrator')).toBeInTheDocument()
    expect(screen.getByText('reviewer@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin')
    // The strip replaces the sign-in links
    expect(screen.queryByRole('link', { name: 'Administrator sign-in' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    // Signing out here stays on the page
    expect(await within(screen.getByRole('contentinfo')).findByRole('link', { name: 'Administrator sign-in' })).toBeInTheDocument()
    expect(screen.queryByText('Signed in as administrator')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contribute', level: 1 })).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'DELETE /api/admin/session')).toBe(true)
    expect(window.localStorage.getItem('mining-market-map.admin-signed-in')).toBeNull()
  })

  test('keeps the administrator signed in, and says so, when sign-out does not reach the server', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
      'DELETE /api/admin/session': () => { throw new TypeError('Failed to fetch') },
    })
    window.localStorage.setItem('mining-market-map.admin-signed-in', '1')
    const user = userEvent.setup()
    renderAt('/contribute')

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText(/Sign-out failed, so you are still signed in./)).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Signed in as administrator')).toBeInTheDocument()
    expect(window.localStorage.getItem('mining-market-map.admin-signed-in')).toBe('1')
  })

  test('does not ask for a session on public pages when no administrator signed in here', async () => {
    const calls = stubApi({ 'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }) })
    renderAt('/contribute')

    expect(await screen.findByRole('heading', { name: 'Contribute', level: 1 })).toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Administrator sign-in' })).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'GET /api/admin/session')).toBe(false)
  })

  test('remembers that an administrator signed in, for the public pages', async () => {
    stubApi({ 'POST /api/admin/session': () => profile(), 'GET /api/admin/reviews': () => Response.json({ items: [] }) })
    const user = userEvent.setup()
    renderAt('/admin/login')

    await user.type(screen.getByLabelText('Email'), 'reviewer@example.com')
    await user.type(screen.getByLabelText('Password'), 'a much longer password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    expect(window.localStorage.getItem('mining-market-map.admin-signed-in')).toBe('1')
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
          kind: 'submission', correction_id: null, changed_fields: [], contributor_email: null, contributor_organisation: null,
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

  test('marks a record its contributor changed while it waited', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({
        items: [{
          id: 12, site_name: 'Kalgoorlie Super Pit', country_code: 'AU', region: 'Goldfields',
          machine_manufacturer: 'Sandvik', machine_model: 'LH517i', machine_type: 'lhd', quantity: 8,
          technology_supplier: 'Sandvik', technology_product: null, evidence_count: 2, submitted_at: '2026-10-05T00:00:00Z',
          kind: 'correction', correction_id: null, changed_fields: ['evidence_urls'], after_changes_requested: false, updated_while_pending: true,
          resubmission_of: null, contributor_email: null, contributor_organisation: null,
        }],
      }),
    })
    renderAt('/admin')

    const row = (await screen.findByText('Kalgoorlie Super Pit')).closest('tr')
    if (!row) throw new Error('no row')
    expect(within(row).getByText('Updated while waiting')).toHaveClass('admin-kind--changes')
  })

  test('marks a resubmission of a rejected record', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({
        items: [{
          id: 14, site_name: 'Kalgoorlie Super Pit', country_code: 'AU', region: 'Goldfields',
          machine_manufacturer: 'Sandvik', machine_model: 'LH517i', machine_type: 'lhd', quantity: 8,
          technology_supplier: 'Sandvik', technology_product: null, evidence_count: 1, submitted_at: '2026-10-05T00:00:00Z',
          kind: 'submission', correction_id: null, changed_fields: [], after_changes_requested: false, resubmission_of: 12,
          contributor_email: null, contributor_organisation: null,
        }],
      }),
    })
    renderAt('/admin')

    const row = (await screen.findByText('Kalgoorlie Super Pit')).closest('tr')
    if (!row) throw new Error('no row')
    expect(within(row).getByText('Resubmission')).toHaveClass('admin-kind--resubmission')
    expect(within(row).getByText('Replaces rejected record 12')).toBeInTheDocument()
  })

  test('marks a record its contributor updated after a request for changes', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({
        items: [{
          id: 12, site_name: 'Kalgoorlie Super Pit', country_code: 'AU', region: 'Goldfields',
          machine_manufacturer: 'Sandvik', machine_model: 'LH517i', machine_type: 'lhd', quantity: 10,
          technology_supplier: 'Sandvik', technology_product: 'AutoMine', evidence_count: 2, submitted_at: '2026-10-05T00:00:00Z',
          kind: 'correction', correction_id: null, changed_fields: ['quantity'], after_changes_requested: true,
          contributor_email: 'field@example.com', contributor_organisation: null,
        }],
      }),
    })
    renderAt('/admin')

    const row = (await screen.findByText('Kalgoorlie Super Pit')).closest('tr')
    if (!row) throw new Error('no row')
    expect(within(row).getByText('Changes made')).toHaveClass('admin-kind--changes')
    expect(within(row).getByText('Quantity')).toBeInTheDocument()
  })
})

describe('proposed corrections', () => {
  const verifiedRecord = (overrides: Record<string, unknown> = {}) => recordDto({
    id: 10, verification_status: 'verified', site_name: 'Roy Hill', quantity: 96, ...overrides,
  })
  const pendingCorrection = {
    id: 1, status: 'pending', submitted_at: '2026-10-05T03:00:00Z',
    contributor_email: 'analyst@example.com', contributor_organisation: null, change_note: 'Fleet update',
    evidence_urls: ['https://example.com/fleet-2026'],
    changes: [
      { field: 'quantity', before: 96, proposed: 100, current: 96 },
      { field: 'deployment_status', before: 'announced', proposed: 'operational', current: 'commissioning' },
    ],
  }

  test('the queue shows a correction, the fields it changes and who sent it', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/reviews': () => Response.json({
        items: [{
          id: 10, site_name: 'Roy Hill', country_code: 'AU', region: 'Pilbara',
          machine_manufacturer: 'Caterpillar', machine_model: '793F', machine_type: 'haul_truck', quantity: 96,
          technology_supplier: 'Caterpillar', technology_product: 'MineStar', evidence_count: 1, submitted_at: '2026-10-05T03:00:00Z',
          kind: 'correction', correction_id: 1, changed_fields: ['quantity', 'evidence_urls'],
          contributor_email: 'analyst@example.com', contributor_organisation: null,
        }],
      }),
    })
    renderAt('/admin')

    const row = (await screen.findByText('Roy Hill')).closest('tr')
    if (!row) throw new Error('no row')
    expect(within(row).getByText('Correction')).toBeInTheDocument()
    expect(within(row).getByText('Quantity, Evidence urls')).toBeInTheDocument()
    expect(within(row).getByText('analyst@example.com')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /review correction 1 to roy hill record 10/i })).toHaveAttribute('href', '/admin/deployments/10')
  })

  test('a verified record shows the proposal, flags a field that changed since, and approves it', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/10': [
        () => Response.json(verifiedRecord({ corrections: [pendingCorrection] })),
        () => Response.json(verifiedRecord({
          quantity: 100,
          corrections: [{ ...pendingCorrection, status: 'approved' }],
          reviews: [{ decision: 'approved', note: null, administrator: 'reviewer@example.com', reviewed_at: '2026-10-05T04:00:00Z', correction_id: 1 }],
        })),
      ],
      'POST /api/admin/corrections/1/reviews': () => Response.json({ id: 5, correction_status: 'approved', verification_status: 'verified' }, { status: 201 }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/10')

    const table = await screen.findByRole('table', { name: 'Proposed changes' })
    const quantity = within(table).getByRole('row', { name: /Quantity/ })
    expect(within(quantity).getByText('96')).toBeInTheDocument()
    expect(within(quantity).getByText('100')).toBeInTheDocument()
    expect(within(table).getByText(/Now Commissioning: the record changed after this was submitted/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://example.com/fleet-2026' })).toHaveAttribute('rel', 'noopener noreferrer')
    // A verified record has no decision of its own, only the correction's
    expect(screen.getAllByRole('button', { name: 'Record decision' })).toHaveLength(1)
    // A proposal sent back leaves the record verified, so it keeps the option
    expect(screen.getByLabelText(/^Needs changes/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Record decision' }))

    expect(await screen.findByText('Decision on the correction recorded.')).toBeInTheDocument()
    // Decided on the version of the record the page shows, so a change since is refused
    expect(calls.find((call) => call.key === 'POST /api/admin/corrections/1/reviews')?.body).toEqual({ decision: 'approved', note: null, version: '2026-10-02T00:00:00Z' })
    expect(screen.queryByRole('table', { name: 'Proposed changes' })).not.toBeInTheDocument()
    expect(screen.getByText('Correction approved')).toBeInTheDocument()
    expect(screen.getByText('Decided corrections')).toBeInTheDocument()
  })

  test('a verified record without corrections explains that none are waiting', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/10': () => Response.json(verifiedRecord()),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    renderAt('/admin/deployments/10')

    expect(await screen.findByText(/This record is verified/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument()
  })
})

describe('record review', () => {
  test('shows the request a record with changes requested waits on, and still lets the administrator decide', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        verification_status: 'changes_requested',
        reviews: [{ decision: 'needs_changes', note: 'Add the operator announcement', administrator: 'lead@example.com', reviewed_at: '2026-10-05T01:00:00Z', correction_id: null }],
      })),
      'POST /api/admin/deployments/12/reviews': () => Response.json({ id: 2, verification_status: 'verified' }, { status: 201 }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/12')

    const waiting = await screen.findByRole('region', { name: 'Waiting for the contributor' })
    expect(waiting).toHaveTextContent('Changes requested by lead@example.com')
    expect(waiting).toHaveTextContent('Add the operator announcement')
    expect(screen.getByText('Changes requested', { selector: '.status-badge' })).toBeInTheDocument()
    // Fixing it and approving it here does not need the queue
    expect(screen.getByRole('button', { name: 'Edit record' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Record decision' }))
    expect(calls.find((call) => call.key === 'POST /api/admin/deployments/12/reviews')?.body).toEqual({ decision: 'approved', note: null, version: '2026-10-02T00:00:00Z' })
  })

  test('starts a record that lacks evidence and coordinates on asking the contributor for them', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({ evidence: [], latitude: null, longitude: null })),
      'POST /api/admin/deployments/12/reviews': () => Response.json({ id: 3, verification_status: 'changes_requested' }, { status: 201 }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/12')

    expect(await screen.findByText('Not ready to approve')).toBeInTheDocument()
    expect(screen.getByText('No evidence URL')).toBeInTheDocument()
    expect(screen.getByText('No site coordinates')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Approve/)).toBeDisabled()
    expect(screen.getByLabelText(/^Needs changes/)).toBeChecked()
    expect(screen.getByLabelText(/^Note/)).toHaveValue("Before this can be approved, please add a link to a public source (such as the operator's announcement) and the site's latitude and longitude.")

    await user.click(screen.getByRole('button', { name: 'Record decision' }))
    expect(calls.find((call) => call.key === 'POST /api/admin/deployments/12/reviews')?.body).toEqual(expect.objectContaining({ decision: 'needs_changes' }))
  })

  test('asks only for what the contributor can supply when other records share the site', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({ evidence: [], latitude: null, longitude: null, site_shared: true })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    renderAt('/admin/deployments/12')

    expect(await screen.findByText('No site coordinates (other records share this site, so the contributor cannot add them)')).toBeInTheDocument()
    // The request goes out for the evidence only; the location is the administrator's to add
    expect(screen.getByLabelText(/^Note/)).toHaveValue("Before this can be approved, please add a link to a public source (such as the operator's announcement).")

    // With nothing the contributor can supply, the panel offers only Edit record
    cleanup()
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({ latitude: null, longitude: null, site_shared: true })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    renderAt('/admin/deployments/12')
    const blockers = (await screen.findByText('Not ready to approve')).closest('div') as HTMLElement
    expect(blockers).toHaveTextContent('Add it yourself with Edit record.')
    expect(blockers).not.toHaveTextContent('Needs changes')
    expect(screen.getByLabelText(/^Note/)).toHaveValue('')
  })

  test('offers an email to the contributor who submitted the record, when they gave one', async () => {
    const created = { action: 'create', previous_values: {}, change_note: null, administrator: null, changed_at: '2026-10-01T00:00:00Z' }
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        revisions: [{ ...created, contributor_email: 'field@example.com', contributor_organisation: 'Example Mining' }],
      })),
      'GET /api/admin/deployments/13': () => Response.json(recordDto({
        id: 13,
        revisions: [{ ...created, contributor_email: null, contributor_organisation: null }],
      })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const { unmount } = renderAt('/admin/deployments/12')

    const panel = await screen.findByRole('region', { name: 'Contributor' })
    expect(panel).toHaveTextContent('field@example.com · Example Mining')
    const link = within(panel).getByRole('link', { name: 'Email contributor' })
    expect(link.getAttribute('href')).toMatch(/^mailto:field@example\.com\?subject=Your%20Mining%20Market%20Map%20submission%20\(record%2012\)&body=/)
    unmount()

    renderAt('/admin/deployments/13')
    expect(await screen.findByText(/No contact email was given/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Email contributor' })).not.toBeInTheDocument()
  })

  test('shows the rejected record a resubmission replaces, and links back from it', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/14': () => Response.json(recordDto({
        id: 14,
        resubmission_of: { id: 12, verification_status: 'rejected', decision: 'rejected', note: 'Wrong site', administrator: 'lead@example.com', reviewed_at: '2026-10-04T01:00:00Z' },
        resubmitted_as: [],
      })),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        verification_status: 'rejected',
        resubmission_of: null,
        resubmitted_as: [{ id: 14, verification_status: 'pending_review' }],
      })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/14')

    const panel = await screen.findByRole('region', { name: 'Resubmission of a rejected record' })
    expect(panel).toHaveTextContent('rejected by lead@example.com')
    expect(panel).toHaveTextContent('Wrong site')
    await user.click(within(panel).getByRole('link', { name: 'record 12' }))

    expect(await screen.findByText(/Resubmitted as/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'record 14' })).toHaveAttribute('href', '/admin/deployments/14')
  })

  test('reloads the record instead of deciding on a version the contributor has since changed', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': [
        () => Response.json(recordDto()),
        () => Response.json(recordDto({ quantity: 10, updated_at: '2026-10-03T00:00:00Z' })),
      ],
      'POST /api/admin/deployments/12/reviews': () => Response.json({ error: 'the record changed since you opened it', updated_at: '2026-10-03T00:00:00Z' }, { status: 409 }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/deployments/12')

    await screen.findByRole('heading', { name: 'Kalgoorlie Super Pit' })
    await user.click(screen.getByRole('button', { name: 'Record decision' }))

    expect(await screen.findByText(/changed this record while you had it open/)).toBeInTheDocument()
    expect(screen.getByText('10', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeEnabled()
  })

  test('closes a rejected record: no decision and no editing', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        verification_status: 'rejected',
        reviews: [{ decision: 'rejected', note: 'Duplicate', administrator: 'reviewer@example.com', reviewed_at: '2026-10-05T01:00:00Z', correction_id: null }],
      })),
    })
    renderAt('/admin/deployments/12')

    expect(await screen.findByText(/This record is rejected and closed/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit record' })).not.toBeInTheDocument()
  })

  test('shows the record, opens evidence safely, and records a rejection with a note', async () => {
    const calls = stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': [
        () => Response.json(recordDto()),
        () => Response.json(recordDto({
          verification_status: 'rejected',
          reviews: [{ decision: 'rejected', note: 'Duplicate', administrator: 'reviewer@example.com', reviewed_at: '2026-10-05T01:00:00Z', correction_id: null }],
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
    expect(screen.getByLabelText(/^Needs changes/)).toBeInTheDocument()
    // The contributor reads the decision on their own submission
    expect(screen.getByLabelText(/^Note/)).toHaveAccessibleDescription('Shown to the contributor.')

    await user.click(screen.getByLabelText(/^Reject/))
    await user.click(screen.getByRole('button', { name: 'Record decision' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Add a note')

    await user.type(screen.getByLabelText(/Note \(required\)/), 'Duplicate')
    await user.click(screen.getByRole('button', { name: 'Record decision' }))

    expect(await screen.findByText('Decision recorded.')).toBeInTheDocument()
    expect(screen.getByText('Rejected', { selector: '.status-badge' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument()
    expect(screen.getByText(/by reviewer@example.com/)).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /api/admin/deployments/12/reviews')?.body).toEqual({ decision: 'rejected', note: 'Duplicate', version: '2026-10-02T00:00:00Z' })
  })

  test('shows possible duplicate deployments with a link to the matching record', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        possible_duplicates: [{
          id: 13,
          verification_status: 'pending_review',
          machine_manufacturer: 'Sandvik',
          machine_model: '930E',
          machine_type: 'haul_truck',
          technology_product: 'AutoMine',
          quantity: 15,
          commissioning_date: '2024-05-10',
          status: 'operational',
        }],
      })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })

    renderAt('/admin/deployments/12')

    expect(await screen.findByRole('heading', {
      name: 'Possible duplicate deployments',
    })).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent(
      /1 possible matching record was found at this site/,
    )

    const duplicateLink = screen.getByRole('link', {
      name: /Record 13: Sandvik 930E/,
    })
    expect(duplicateLink).toHaveAttribute('href', '/admin/deployments/13')
    expect(screen.getByText(/15 machines/)).toBeInTheDocument()
    expect(screen.getByText(/Operational · Commissioned 10\/05\/2024/)).toBeInTheDocument()
  })

  test('does not show a duplicate warning when there are no possible duplicates', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        possible_duplicates: [],
      })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })

    renderAt('/admin/deployments/12')

    expect(await screen.findByRole('heading', { name: 'Details' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('heading', {
      name: 'Possible duplicate deployments',
    })).not.toBeInTheDocument()
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

    // Editing is folded away until asked for
    expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Edit record' }))
    const quantity = await screen.findByLabelText('Quantity')
    const automation = screen.getByLabelText('Automation level')
    expect(within(automation).queryByRole('option', { name: 'Not recorded' })).not.toBeInTheDocument()
    expect(within(automation).queryByRole('option', { name: 'Clear level' })).not.toBeInTheDocument()
    await user.clear(quantity)
    await user.type(quantity, '9')
    await user.type(screen.getByLabelText('Change note (optional)'), 'Updated fleet count')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    expect(await screen.findByText('Correction saved.')).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'PATCH /api/admin/deployments/12')?.body).toEqual({ quantity: 9, change_note: 'Updated fleet count' })
    expect(screen.getByText(/Corrected/)).toBeInTheDocument()
    expect(screen.getByText('Previous quantity')).toBeInTheDocument()
  })

  test('shows proposed values for contributor evidence and verification corrections', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        evidence: [{ url: 'https://example.com/new-evidence', source_type: 'news', publisher: null, published_date: null }],
        revisions: [{
          action: 'update',
          previous_values: {
            evidence_urls: ['https://example.com/old-evidence'],
            verification_status: 'verified',
          },
          change_note: 'Contributor correction',
          contributor_email: 'field@example.com',
          contributor_organisation: 'Example Mining',
          administrator: null,
          changed_at: '2026-10-05T02:00:00Z',
        }],
      })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    renderAt('/admin/deployments/12')

    expect(await screen.findByText('What changed')).toBeInTheDocument()
    expect(screen.getByText('Proposed: https://example.com/new-evidence')).toBeInTheDocument()
    // The status it came back from is not a field the contributor changed
    expect(screen.queryByText('Proposed: pending_review')).not.toBeInTheDocument()
  })

  test('shows the request for changes an update answers', async () => {
    stubApi({
      'GET /api/admin/session': () => profile(),
      'GET /api/admin/deployments/12': () => Response.json(recordDto({
        quantity: 10,
        reviews: [{ decision: 'needs_changes', note: 'Check the fleet size', administrator: 'lead@example.com', reviewed_at: '2026-10-04T01:00:00Z', correction_id: null }],
        revisions: [{
          action: 'update',
          previous_values: { quantity: 8, verification_status: 'changes_requested' },
          change_note: 'Two more since June',
          contributor_email: 'field@example.com',
          contributor_organisation: null,
          administrator: null,
          changed_at: '2026-10-05T02:00:00Z',
        }],
      })),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
    })
    renderAt('/admin/deployments/12')

    const panel = await screen.findByRole('region', { name: 'Changes made on request' })
    expect(panel).toHaveTextContent('Answers the request from lead@example.com')
    expect(panel).toHaveTextContent('Check the fleet size')
    expect(panel).toHaveTextContent("The contributor's note: Two more since June")
    expect(panel).toHaveTextContent('Before: 8')
    expect(panel).not.toHaveTextContent('Verification status')
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
    id: 12, verificationStatus: 'pending_review', siteName: 'S', countryCode: 'AU', latitude: null, longitude: null, siteShared: false, region: null, commodity: null,
    machineManufacturer: 'M', machineModel: null, modelVariant: null, machineType: 'lhd', quantity: 8,
    technologySupplier: null, technologyProduct: null, possibleDuplicates: [], resubmissionOf: null, resubmittedAs: [],
    automationLevel: null, environment: null,
    installationType: 'unknown', status: null, commissioningDate: null, commissioningYear: null,
    validFrom: null, validTo: null, updatedAt: '2026-10-02T00:00:00.000Z', evidence: [], reviews: [], revisions: [], corrections: [],
  } satisfies ReviewRecord
  const unchanged = {
    quantity: '8', environment: '', deploymentStatus: '', automationLevel: '', installationType: 'unknown',
    commissioningDate: '', latitude: '', longitude: '', technologySupplier: '', technologyProduct: '', evidenceUrl: '', changeNote: '',
  }

  test('asks for a change when nothing differs', () => {
    expect(buildCorrection(record, unchanged)).toBe('Change at least one field or add evidence.')
  })

  test('allows a supplier without a product but not a product without a supplier', () => {
    expect(buildCorrection(record, { ...unchanged, technologySupplier: 'RCT' })).toEqual({ technologySupplier: 'RCT', technologyProduct: '' })
    expect(buildCorrection(record, { ...unchanged, technologyProduct: 'ControlMaster' })).toBe('Enter a technology supplier before adding a product.')
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

  test('does not clear a recorded automation level when the empty value is selected', () => {
    const recordWithLevel = { ...record, automationLevel: 'semi_autonomous' }
    const values = { ...unchanged, automationLevel: '' }
    expect(buildCorrection(recordWithLevel, values)).toBe('Change at least one field or add evidence.')
  })

  test('updates and explicitly clears validity dates', () => {
    const datedRecord = { ...record, validFrom: '2024-01-01', validTo: '2025-01-01' }
    expect(buildCorrection(datedRecord, { ...unchanged, validFrom: '2024-02-01', validTo: '2025-01-01' })).toEqual({ validFrom: '2024-02-01' })
    expect(buildCorrection(datedRecord, { ...unchanged, validFrom: '2024-01-01', validTo: '2025-01-01', clearValidTo: true })).toEqual({ clearValidTo: true })
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
