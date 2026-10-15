import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { MyContributionsProvider, STORAGE_KEY } from '../my-contributions'
import ContributePage from '../pages/ContributePage'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../types'

const KEY = 'k'.repeat(43)

const statusItem = (overrides: Record<string, unknown> = {}) => ({
  id: 20412,
  verification_status: 'pending_review',
  site_id: 7,
  site_name: 'Ashgrove Mine',
  country_code: 'AU',
  machine_manufacturer: 'Caterpillar',
  machine_model: '793F',
  machine_type: 'haul_truck',
  quantity: 12,
  submitted_at: '2026-10-02T03:00:00.000Z',
  updated_at: '2026-10-09T03:00:00.000Z',
  decision: null,
  resubmission_of: null,
  resubmitted_as: null,
  ...overrides,
})

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: 20412, key: KEY, siteName: 'Ashgrove Mine', machine: 'Caterpillar 793F', submittedAt: '2026-10-02T03:00:00.000Z', ...overrides,
})

type Handler = (init: RequestInit | undefined) => Response
/** Answers fetch by "METHOD path"; anything unexpected fails the test loudly. */
function stubApi(routes: Record<string, Handler>) {
  const calls: { key: string; init: RequestInit | undefined }[] = []
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${new URL(String(input), 'http://localhost').pathname}`
    calls.push({ key, init })
    const handler = routes[key]
    return handler ? handler(init) : Response.json({ error: `unexpected ${key}` }, { status: 500 })
  }))
  return calls
}

function renderPage(path = '/contribute?tab=mine') {
  window.history.replaceState(null, '', path)
  return render(
    <MemoryRouter>
      <MyContributionsProvider>
        <ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />
      </MyContributionsProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('My contributions', () => {
  test('keeps a new submission in this browser and lists it under My contributions', async () => {
    const user = userEvent.setup()
    stubApi({
      'POST /api/contributions': () => Response.json({ id: 20450, verification_status: 'pending_review', key: KEY }, { status: 201 }),
    })
    renderPage('/contribute')

    await user.type(screen.getByLabelText(/mine site name/i), 'Roy Hill')
    await user.selectOptions(screen.getByLabelText(/country/i), 'AU')
    await user.selectOptions(screen.getByLabelText(/machine type/i), 'haul_truck')
    await user.type(screen.getByLabelText(/machine manufacturer/i), 'Caterpillar')
    await user.type(screen.getByLabelText(/machine model/i), '793F')
    await user.type(screen.getByLabelText(/technology supplier/i), 'Caterpillar')
    await user.click(screen.getByLabelText('Highly Autonomous'))
    await user.type(screen.getByLabelText(/quantity/i), '10')
    await user.click(screen.getByLabelText(/authorised to disclose/i))
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(await screen.findByText(/under My contributions in this browser/i)).toHaveTextContent(
      "Before it can be approved it needs a source link and the site's coordinates, unless the site is already on the map; the reviewer may ask you for them.",
    )
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      expect.objectContaining({ id: 20450, key: KEY, siteName: 'Roy Hill', machine: 'Caterpillar 793F' }),
    ])

    await user.click(screen.getByRole('button', { name: 'See my contributions' }))
    expect(screen.getByRole('tab', { name: /my contributions/i })).toHaveAttribute('aria-selected', 'true')
    const row = screen.getByRole('listitem', { name: /roy hill/i })
    expect(within(row).getByText(/#20450/)).toBeInTheDocument()
    expect(within(row).getByText('Pending review')).toBeInTheDocument()
  })

  test('checks the stored submissions when the site opens and shows the request for changes', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([stored()]))
    const calls = stubApi({
      'POST /api/contributions/status': () => Response.json({ items: [statusItem({
        verification_status: 'changes_requested',
        decision: { decision: 'needs_changes', note: 'Add the operator announcement', decided_at: '2026-10-09T03:00:00.000Z' },
      })] }),
    })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    expect(await within(row).findByText('Changes requested')).toBeInTheDocument()
    expect(within(row).getByText('Add the operator announcement')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Update submission' })).toBeInTheDocument()
    expect(within(row).getByText(/Caterpillar 793F × 12/)).toBeInTheDocument()
    // The key travels in the request body, never in the address
    const check = calls.find((call) => call.key === 'POST /api/contributions/status')
    expect(JSON.parse(String(check?.init?.body))).toEqual({ items: [{ id: 20412, key: KEY }] })
  })

  test('sends an update for review with only what changed, and the key in a header', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([stored()]))
    const calls = stubApi({
      'POST /api/contributions/status': () => Response.json({ items: [statusItem({
        verification_status: 'changes_requested',
        decision: { decision: 'needs_changes', note: 'Check the fleet size', decided_at: '2026-10-09T03:00:00.000Z' },
      })] }),
      'GET /api/contributions/20412': () => Response.json({
        ...statusItem({ verification_status: 'changes_requested' }),
        environment: 'surface', deployment_status: 'operational', automation_level: 'autonomous', installation_type: 'unknown',
        commissioning_date: '2021', evidence_urls: ['https://example.com/forum-post'], latitude: -22.3, longitude: 118.7,
      }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
      'PATCH /api/contributions/20412': () => Response.json({ id: 20412, verification_status: 'pending_review' }),
    })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    await user.click(await within(row).findByRole('button', { name: 'Update submission' }))
    const quantity = await within(row).findByRole('textbox', { name: 'Quantity' })
    await waitFor(() => expect(quantity).toHaveFocus())
    expect(within(row).getByText(/Already supplied: https:\/\/example.com\/forum-post/)).toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: 'Send for review' }))
    expect(within(row).getByRole('alert')).toHaveTextContent('Check the highlighted fields.')

    await user.clear(quantity)
    await user.type(quantity, '14')
    await user.type(within(row).getByRole('textbox', { name: /new source url/i }), 'https://example.com/annual-report')
    await user.click(within(row).getByLabelText(/i confirm that this information is accurate/i))
    await user.click(within(row).getByRole('button', { name: 'Send for review' }))

    expect(await within(row).findByText(/Sent for review/)).toBeInTheDocument()
    expect(within(row).getByText('Pending review')).toBeInTheDocument()
    // Back in review, it can still be updated, now as a secondary action
    expect(within(row).getByRole('button', { name: 'Update submission' })).toHaveClass('button--secondary')
    const patch = calls.find((call) => call.key === 'PATCH /api/contributions/20412')
    expect(new Headers(patch?.init?.headers).get('X-Contribution-Key')).toBe(KEY)
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ quantity: 14, evidence_urls: ['https://example.com/annual-report'], disclosure_accepted: true })
  })

  test('asks for the site location when the site has none, and sends it with the update', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([stored()]))
    const calls = stubApi({
      'POST /api/contributions/status': () => Response.json({ items: [statusItem({
        verification_status: 'changes_requested',
        decision: { decision: 'needs_changes', note: "Please add the site's latitude and longitude.", decided_at: '2026-10-09T03:00:00.000Z' },
      })] }),
      'GET /api/contributions/20412': () => Response.json({
        ...statusItem({ verification_status: 'changes_requested' }),
        environment: 'surface', deployment_status: 'operational', automation_level: 'autonomous', installation_type: 'unknown',
        commissioning_date: '2021', evidence_urls: ['https://example.com/announcement'], latitude: null, longitude: null,
      }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
      'PATCH /api/contributions/20412': () => Response.json({ id: 20412, verification_status: 'pending_review' }),
    })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    await user.click(await within(row).findByRole('button', { name: 'Update submission' }))
    const latitude = await within(row).findByRole('textbox', { name: 'Latitude' })
    await user.type(latitude, '-22.3')
    await user.click(within(row).getByLabelText(/i confirm that this information is accurate/i))
    await user.click(within(row).getByRole('button', { name: 'Send for review' }))
    expect(within(row).getByText('Enter a longitude between -180 and 180.')).toBeInTheDocument()

    await user.type(within(row).getByRole('textbox', { name: 'Longitude' }), '118.7')
    await user.click(within(row).getByRole('button', { name: 'Send for review' }))
    expect(await within(row).findByText(/Sent for review/)).toBeInTheDocument()
    const patch = calls.find((call) => call.key === 'PATCH /api/contributions/20412')
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ latitude: -22.3, longitude: 118.7, disclosure_accepted: true })
  })

  test('shows a rejection with its reason, a verified record with a link, and one the site no longer reports', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
      stored(),
      stored({ id: 20377, siteName: 'Northgate Pit' }),
      stored({ id: 20300, siteName: 'Old Pit' }),
    ]))
    stubApi({
      'POST /api/contributions/status': () => Response.json({ items: [
        statusItem({ id: 20377, site_id: 9, site_name: 'Northgate Pit', verification_status: 'verified', decision: { decision: 'approved', note: null, decided_at: '2026-09-25T03:00:00.000Z' } }),
        statusItem({ verification_status: 'rejected', decision: { decision: 'rejected', note: 'This is the processing plant, not the mine.', decided_at: '2026-09-18T03:00:00.000Z' } }),
      ] }),
    })
    renderPage()

    const rejected = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    expect(await within(rejected).findByText('This is the processing plant, not the mine.')).toBeInTheDocument()
    expect(within(rejected).getByText(/This submission is closed/)).toBeInTheDocument()
    const verified = screen.getByRole('listitem', { name: /northgate pit/i })
    expect(within(verified).getByRole('link', { name: 'View on register' })).toHaveAttribute('href', '/equipment?site_id=9')
    const missing = screen.getByRole('listitem', { name: /old pit/i })
    expect(within(missing).getByText('No longer available')).toBeInTheDocument()
  })

  test('lets a submission waiting for review be updated, and keeps it waiting', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([stored()]))
    const calls = stubApi({
      'POST /api/contributions/status': () => Response.json({ items: [statusItem()] }),
      'GET /api/contributions/20412': () => Response.json({
        ...statusItem(),
        latitude: -30.7, longitude: 121.4, region: null, commodity: null, machine_model_variant: null,
        technology_supplier: 'Caterpillar', technology_product: null,
        environment: 'surface', deployment_status: 'operational', automation_level: 'autonomous', installation_type: 'unknown',
        commissioning_date: null, evidence_urls: [],
      }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
      'PATCH /api/contributions/20412': () => Response.json({ id: 20412, verification_status: 'pending_review' }),
    })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    const button = await within(row).findByRole('button', { name: 'Update submission' })
    expect(button).toHaveClass('button--secondary')
    await user.click(button)
    await user.type(await within(row).findByRole('textbox', { name: /new source url/i }), 'https://example.com/annual-report')
    await user.click(within(row).getByLabelText(/i confirm that this information is accurate/i))
    await user.click(within(row).getByRole('button', { name: 'Send for review' }))

    expect(await within(row).findByText(/still waiting for review, now with your changes/)).toBeInTheDocument()
    expect(within(row).getByText('Pending review')).toBeInTheDocument()
    expect(JSON.parse(String(calls.find((call) => call.key === 'PATCH /api/contributions/20412')?.init?.body))).toEqual({
      evidence_urls: ['https://example.com/annual-report'], disclosure_accepted: true,
    })
  })

  test('resubmits a rejected submission from a prefilled form, linked to it', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([stored()]))
    const calls = stubApi({
      'POST /api/contributions/status': () => Response.json({ items: [statusItem({
        verification_status: 'rejected',
        decision: { decision: 'rejected', note: 'This is the processing plant, not the mine.', decided_at: '2026-09-18T03:00:00.000Z' },
      })] }),
      'GET /api/contributions/20412': () => Response.json({
        ...statusItem({ verification_status: 'rejected' }),
        latitude: -30.7, longitude: 121.4, region: 'Goldfields', commodity: 'gold', machine_model_variant: null,
        technology_supplier: 'Caterpillar', technology_product: 'Cat Command',
        environment: 'surface', deployment_status: 'operational', automation_level: 'autonomous', installation_type: 'unknown',
        commissioning_date: '2021', evidence_urls: ['https://example.com/plant'],
      }),
      'POST /api/contributions': () => Response.json({ id: 20460, verification_status: 'pending_review', key: 'n'.repeat(43) }, { status: 201 }),
    })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    await user.click(await within(row).findByRole('button', { name: 'Resubmit' }))

    expect(await screen.findByRole('heading', { name: 'Resubmitting #20412' })).toBeInTheDocument()
    expect(screen.getByText('This is the processing plant, not the mine.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'New contribution' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/mine site name/i)).toHaveValue('Ashgrove Mine')
    expect(screen.getByPlaceholderText('e.g. 793F')).toHaveValue('793F')
    expect(screen.getByLabelText(/site latitude/i)).toHaveValue(-30.7)
    expect(screen.getByDisplayValue('https://example.com/plant')).toBeInTheDocument()

    const site = screen.getByLabelText(/mine site name/i)
    await user.clear(site)
    await user.type(site, 'Ashgrove North Pit')
    await user.click(screen.getByLabelText(/authorised to disclose/i))
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(await screen.findByRole('heading', { name: /contribution received/i })).toBeInTheDocument()
    const post = calls.find((call) => call.key === 'POST /api/contributions')
    expect(JSON.parse(String(post?.init?.body))).toEqual(expect.objectContaining({
      site_name: 'Ashgrove North Pit',
      machine_manufacturer: 'Caterpillar',
      resubmission_of: { id: 20412, key: KEY },
    }))

    await user.click(screen.getByRole('button', { name: 'See my contributions' }))
    // One application: the resubmission is current and the rejected one is folded under it
    const group = screen.getByRole('listitem', { name: 'Application: Ashgrove North Pit · Caterpillar 793F' })
    expect(within(group).getByRole('listitem', { name: /ashgrove north pit/i })).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { name: /ashgrove mine/i })).not.toBeInTheDocument()
    await user.click(within(group).getByRole('button', { name: 'Earlier attempts (1)' }))
    const earlier = within(group).getByRole('list', { name: 'Earlier attempts' })
    expect(earlier).toHaveTextContent('#20412')
    expect(earlier).toHaveTextContent('Resubmitted as #20460.')
    expect(earlier).toHaveTextContent('This is the processing plant, not the mine.')
  })

  test('removes a submission from this browser only after confirming', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([stored()]))
    stubApi({ 'POST /api/contributions/status': () => Response.json({ items: [statusItem()] }) })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    await user.click(within(row).getByRole('button', { name: 'Remove from this browser' }))
    await user.click(within(row).getByRole('button', { name: 'Keep' }))
    expect(screen.getByRole('listitem', { name: /ashgrove mine/i })).toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: 'Remove from this browser' }))
    await user.click(within(row).getByRole('button', { name: 'Remove' }))
    expect(screen.queryByRole('listitem', { name: /ashgrove mine/i })).not.toBeInTheDocument()
    expect(screen.getByText('No contributions in this browser yet')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([])
  })

  test('adds a submission from its tracking link and takes the key out of the address bar', async () => {
    stubApi({
      'GET /api/contributions/20412': (init) => new Headers(init?.headers).get('X-Contribution-Key') === KEY
        ? Response.json({
            ...statusItem({ verification_status: 'changes_requested' }),
            latitude: -30.7, longitude: 121.4, region: null, commodity: null, machine_model_variant: null,
            technology_supplier: 'Caterpillar', technology_product: null, environment: null, deployment_status: null,
            automation_level: 'autonomous', installation_type: 'unknown', commissioning_date: null, evidence_urls: [],
          })
        : Response.json({ error: 'contribution not found' }, { status: 404 }),
    })
    renderPage(`/contribute?tab=mine#track=20412.${KEY}`)

    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?tab=mine')
    expect(await screen.findByText('Added #20412 to this browser from its tracking link.')).toBeInTheDocument()
    const row = screen.getByRole('listitem', { name: /ashgrove mine/i })
    expect(within(row).getByText('Changes requested')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([expect.objectContaining({ id: 20412, key: KEY })])
  })

  test('says when a tracking link does not open a submission', async () => {
    stubApi({ 'GET /api/contributions/20412': () => Response.json({ error: 'contribution not found' }, { status: 404 }) })
    renderPage(`/contribute?tab=mine#track=20412.${'z'.repeat(43)}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('This tracking link is not valid, or the submission no longer exists.')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('copies a private tracking link for a submission', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([stored()]))
    stubApi({ 'POST /api/contributions/status': () => Response.json({ items: [statusItem()] }) })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /ashgrove mine/i })
    await user.click(within(row).getByRole('button', { name: 'Copy tracking link' }))
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/contribute?tab=mine#track=20412.${KEY}`)
    expect(within(row).getByRole('status')).toHaveTextContent(/Copied. Anyone with this link can see and update the submission/)
  })

  test('still works when the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const calls = stubApi({})
    renderPage()

    expect(screen.getByText('No contributions in this browser yet')).toBeInTheDocument()
    expect(calls).toEqual([])
  })

  test('moves between the tabs with the arrow keys', async () => {
    const user = userEvent.setup()
    stubApi({})
    renderPage('/contribute')

    screen.getByRole('tab', { name: 'New contribution' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /my contributions/i })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/my contributions/i)
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'New contribution' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Grouping by application', () => {
  test('shows a resubmitted submission and corrections to its record as one application, removed together', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
      stored({ id: 20209, submittedAt: '2026-10-01T03:00:00.000Z' }),
      stored({ id: 20210, submittedAt: '2026-10-03T03:00:00.000Z' }),
      { kind: 'correction', id: 4, key: KEY, deploymentId: 20210, siteName: 'Ashgrove Mine', machine: 'Caterpillar 793F', submittedAt: '2026-10-05T03:00:00.000Z', proposedAgainAs: 5 },
      { kind: 'correction', id: 5, key: KEY, deploymentId: 20210, siteName: 'Ashgrove Mine', machine: 'Caterpillar 793F', submittedAt: '2026-10-06T03:00:00.000Z' },
      stored({ id: 30001, siteName: 'Other Mine', submittedAt: '2026-09-01T03:00:00.000Z' }),
    ]))
    const correction = (id: number, status: string) => ({
      id, deployment_id: 20210, status, submitted_at: '2026-10-05T03:00:00.000Z', site_id: 7, site_name: 'Ashgrove Mine',
      machine_manufacturer: 'Caterpillar', machine_model: '793F', machine_type: 'haul_truck', change_note: null, evidence_urls: [],
      changes: [{ field: 'quantity', before: 12, proposed: 14 }], decision: null,
    })
    stubApi({
      'POST /api/contributions/status': () => Response.json({ items: [
        statusItem({ id: 20209, verification_status: 'rejected', resubmitted_as: 20210, decision: { decision: 'rejected', note: 'Wrong pit.', decided_at: '2026-10-02T03:00:00.000Z' } }),
        statusItem({ id: 20210, verification_status: 'verified', resubmission_of: 20209 }),
        statusItem({ id: 30001, site_name: 'Other Mine' }),
      ] }),
      'POST /api/corrections/status': () => Response.json({ items: [correction(4, 'needs_changes'), correction(5, 'approved')] }),
    })
    renderPage()

    // The two submissions are linked once their statuses are checked
    await user.click(await screen.findByRole('button', { name: 'Earlier attempts (2)' }))
    const group = screen.getByRole('listitem', { name: 'Application: Ashgrove Mine · Caterpillar 793F' })
    // The current submission and the current correction, each once; the rest are earlier attempts
    const current = within(group).getAllByRole('listitem').filter((item) => item.classList.contains('my-contribution'))
    expect(current.map((item) => item.querySelector('.my-contribution__ref')?.textContent)).toEqual([
      expect.stringContaining('#20210'), expect.stringContaining('#C5'),
    ])
    const earlier = within(within(group).getByRole('list', { name: 'Earlier attempts' })).getAllByRole('listitem')
    expect(earlier.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/Correction #C4.*Proposed again as #C5\./), expect.stringMatching(/#20209.*Resubmitted as #20210\..*Wrong pit\./),
    ])
    // A rejected submission that was resubmitted does not still ask for changes
    expect(within(group).queryByRole('button', { name: 'Resubmit' })).not.toBeInTheDocument()
    // Others stay on their own
    expect(screen.getByRole('listitem', { name: /other mine/i })).toBeInTheDocument()

    await user.click(within(group).getByRole('button', { name: 'Remove from this browser' }))
    await user.click(within(group).getByRole('button', { name: 'Remove' }))
    expect(screen.queryByRole('listitem', { name: /application: ashgrove mine/i })).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([expect.objectContaining({ id: 30001 })])
  })
})

describe('Following a proposed correction (#223)', () => {
  const correctionItem = (overrides: Record<string, unknown> = {}) => ({
    id: 5,
    deployment_id: 10,
    status: 'needs_changes',
    submitted_at: '2026-10-08T03:00:00.000Z',
    site_id: 1,
    site_name: 'Roy Hill',
    machine_manufacturer: 'Caterpillar',
    machine_model: '793F',
    machine_type: 'haul_truck',
    change_note: 'Fleet grew',
    evidence_urls: [],
    changes: [{ field: 'quantity', before: 96, proposed: 100 }],
    decision: { decision: 'needs_changes', note: 'Which source says 100?', decided_at: '2026-10-09T03:00:00.000Z' },
    ...overrides,
  })
  const storedCorrection = { kind: 'correction', id: 5, key: KEY, deploymentId: 10, siteName: 'Roy Hill', machine: 'Caterpillar 793F', submittedAt: '2026-10-08T03:00:00.000Z' }
  const registerRecord = {
    id: 10, site_id: 1, site_name: 'Roy Hill', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore',
    machine_manufacturer: 'Caterpillar', machine_model: '793F', model_variant: null, machine_type: 'haul_truck', quantity: 96,
    technology_supplier: 'Caterpillar', technology_product: 'Cat Command', automation_level: 'autonomous', environment: 'surface',
    installation_type: 'unknown', status: 'operational', commissioning_date: '2021-01-01', commissioning_year: 2021, valid_from: '2021-01-01', valid_to: null,
  }

  test('shows what a correction changes and what the reviewer asked, and counts it as needing changes', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([storedCorrection]))
    const calls = stubApi({ 'POST /api/corrections/status': () => Response.json({ items: [correctionItem()] }) })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /correction: roy hill/i })
    expect(within(row).getByText('Changes requested')).toBeInTheDocument()
    expect(within(row).getByText('Quantity').closest('div')).toHaveTextContent('96 → 100')
    expect(within(row).getByText('Which source says 100?')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Propose again' })).toBeInTheDocument()
    expect(JSON.parse(String(calls.find((call) => call.key === 'POST /api/corrections/status')?.init?.body))).toEqual({ items: [{ id: 5, key: KEY }] })
    // Corrections and submissions are checked separately, so no submission request is made
    expect(calls.some((call) => call.key === 'POST /api/contributions/status')).toBe(false)
  })

  test('proposes a correction again from the earlier proposal, and follows the new one', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([storedCorrection]))
    const calls = stubApi({
      'POST /api/corrections/status': () => Response.json({ items: [correctionItem()] }),
      'GET /api/corrections/5': () => Response.json({ ...correctionItem(), record: registerRecord }),
      'GET /api/reference-data': () => Response.json({ error: 'offline' }, { status: 503 }),
      'PATCH /api/deployments/10': () => Response.json({ id: 10, correction_id: 6, verification_status: 'verified', key: 'n'.repeat(43) }, { status: 202 }),
    })
    renderPage()

    const row = await screen.findByRole('listitem', { name: /correction: roy hill/i })
    await user.click(await within(row).findByRole('button', { name: 'Propose again' }))
    const dialog = await screen.findByRole('dialog', { name: /correct this record/i })
    expect(within(dialog).getByRole('textbox', { name: /quantity/i })).toHaveValue('100')
    expect(within(dialog).getByText('Which source says 100?')).toBeInTheDocument()

    await user.type(within(dialog).getByRole('textbox', { name: /evidence url/i }), 'https://example.com/fleet-report')
    await user.click(within(dialog).getByRole('checkbox'))
    await user.click(within(dialog).getByRole('button', { name: /submit correction/i }))

    // The new proposal is current; the earlier one is folded under it with the reviewer's request
    const group = await screen.findByRole('listitem', { name: 'Application: Roy Hill · Caterpillar 793F' })
    expect(within(group).getAllByRole('listitem', { name: /correction: roy hill/i })).toHaveLength(1)
    await user.click(within(group).getByRole('button', { name: 'Earlier attempts (1)' }))
    const earlier = within(within(group).getByRole('list', { name: 'Earlier attempts' })).getByRole('listitem')
    expect(earlier).toHaveTextContent('Proposed again as #C6.')
    expect(earlier).toHaveTextContent('Quantity 96 → 100')
    expect(earlier).toHaveTextContent('Which source says 100?')
    expect(JSON.parse(String(calls.find((call) => call.key === 'PATCH /api/deployments/10')?.init?.body))).toEqual(expect.objectContaining({
      quantity: 100, evidence_urls: ['https://example.com/fleet-report'],
    }))
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'correction', id: 6, deploymentId: 10 }),
      expect.objectContaining({ kind: 'correction', id: 5, proposedAgainAs: 6 }),
    ]))
  })

  test('adds a correction from its tracking link', async () => {
    stubApi({ 'GET /api/corrections/5': () => Response.json({ ...correctionItem({ status: 'approved', decision: { decision: 'approved', note: null, decided_at: '2026-10-09T03:00:00.000Z' } }), record: registerRecord }) })
    renderPage(`/contribute?tab=mine#track=c5.${KEY}`)

    expect(await screen.findByText('Added correction #C5 to this browser from its tracking link.')).toBeInTheDocument()
    const row = screen.getByRole('listitem', { name: /correction: roy hill/i })
    expect(within(row).getByText('Approved')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'View on register' })).toHaveAttribute('href', '/equipment?site_id=1')
    expect(window.location.hash).toBe('')
  })
})
