import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import AdminSubmissionHistoryPage from './AdminSubmissionHistoryPage'

const { getSubmissionHistoryMock, useAdminSessionMock } = vi.hoisted(() => ({
  getSubmissionHistoryMock: vi.fn(),
  useAdminSessionMock: vi.fn(),
}))

vi.mock('../../../lib/api/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/api/admin')>()
  return {
    ...actual,
    getSubmissionHistory: getSubmissionHistoryMock,
  }
})

vi.mock('../session', () => ({
  useAdminSession: useAdminSessionMock,
}))

const sampleItems = [
  {
    id: 12,
    siteName: 'Example Mine',
    countryCode: 'AU',
    verificationStatus: 'verified',
    latestDecision: 'approved',
    latestDecisionIsCorrection: false,
    updatedAt: '2026-10-10T10:00:00.000Z',
  },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/submissions']}>
      <Routes>
        <Route path="/admin/submissions" element={<AdminSubmissionHistoryPage />} />
        <Route path="/admin/deployments/:id" element={<div>Deployment details</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const signedIn = {
  state: {
    status: 'signed-in',
    profile: { email: 'admin@example.com', role: 'admin', mustChangePassword: false },
  },
  signOut: vi.fn().mockResolvedValue(undefined),
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AdminSubmissionHistoryPage', () => {
  it('shows a rejected correction separately from the verified deployment status', async () => {
    getSubmissionHistoryMock.mockResolvedValue([
      {
        ...sampleItems[0],
        latestDecision: 'rejected',
        latestDecisionIsCorrection: true,
        verificationStatus: 'verified',
      },
    ])
    useAdminSessionMock.mockReturnValue({
      state: {
        status: 'signed-in',
        profile: {
          email: 'admin@example.com',
          role: 'admin',
          mustChangePassword: false,
        },
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect(await screen.findByText('Correction rejected')).toBeTruthy()
    expect(screen.getByText('Verified', { selector: '.status-badge' })).toBeTruthy()
  })

  it('loads and displays submission history', async () => {
    getSubmissionHistoryMock.mockResolvedValue(sampleItems)
    useAdminSessionMock.mockReturnValue({
      state: {
        status: 'signed-in',
        profile: {
          email: 'admin@example.com',
          role: 'admin',
          mustChangePassword: false,
        },
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect(await screen.findByText('Example Mine')).toBeTruthy()
    expect(screen.getByText('Approved')).toBeTruthy()
    expect(screen.getByText('Verified', { selector: '.status-badge' })).toBeTruthy()
    expect(screen.getByText('Australia')).toBeTruthy()
    expect(getSubmissionHistoryMock).toHaveBeenCalledWith({ limit: 51, offset: 0, q: undefined, sort: 'updated', order: 'desc' })
  })

  it('searches by ID or site name as you type, once typing pauses', async () => {
    getSubmissionHistoryMock.mockResolvedValue(sampleItems)
    useAdminSessionMock.mockReturnValue(signedIn)

    renderPage()

    await screen.findByText('Example Mine')
    const calls = getSubmissionHistoryMock.mock.calls.length
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '202' } })
    // Nothing is sent until typing pauses
    expect(getSubmissionHistoryMock.mock.calls.length).toBe(calls)

    await waitFor(() => expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: '202', sort: 'updated', order: 'desc' }))
    expect(getSubmissionHistoryMock.mock.calls.length).toBe(calls + 1)

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '  Roy  ' } })
    await waitFor(() => expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: 'Roy', sort: 'updated', order: 'desc' }))
  })

  it('searches at once on Enter and shows everything again when the search is emptied', async () => {
    getSubmissionHistoryMock.mockResolvedValue(sampleItems)
    useAdminSessionMock.mockReturnValue(signedIn)

    renderPage()

    await screen.findByText('Example Mine')
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'Example' } })
    fireEvent.submit(input)
    expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: 'Example', sort: 'updated', order: 'desc' })

    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: undefined, sort: 'updated', order: 'desc' }))
  })

  it('shows an empty state when no submissions are found', async () => {
    getSubmissionHistoryMock.mockResolvedValue([])
    useAdminSessionMock.mockReturnValue({
      state: {
        status: 'signed-in',
        profile: {
          email: 'admin@example.com',
          role: 'admin',
          mustChangePassword: false,
        },
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect(await screen.findByText('No submissions found')).toBeTruthy()
  })

  it('shows an error when the API request fails', async () => {
    getSubmissionHistoryMock.mockRejectedValue(new Error('Request failed'))
    useAdminSessionMock.mockReturnValue({
      state: {
        status: 'signed-in',
        profile: {
          email: 'admin@example.com',
          role: 'admin',
          mustChangePassword: false,
        },
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect(await screen.findByText('Request failed')).toBeTruthy()
  })

  it('links each submission to its details page', async () => {
    getSubmissionHistoryMock.mockResolvedValue(sampleItems)
    useAdminSessionMock.mockReturnValue({
      state: {
        status: 'signed-in',
        profile: {
          email: 'admin@example.com',
          role: 'admin',
          mustChangePassword: false,
        },
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect(await screen.findByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/admin/deployments/12',
    )
  })

  it('disables Next on a full final page', async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      ...sampleItems[0],
      id: 200 - index,
    }))

    getSubmissionHistoryMock.mockResolvedValue(items)

    useAdminSessionMock.mockReturnValue({
      state: {
        status: 'signed-in',
        profile: {
          email: 'admin@example.com',
          role: 'admin',
          mustChangePassword: false,
        },
      },
      signOut: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect((await screen.findAllByText('Example Mine')).length).toBe(50)
    expect(getSubmissionHistoryMock).toHaveBeenCalledWith({ limit: 51, offset: 0, q: undefined, sort: 'updated', order: 'desc' })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
  it('colours each status and decision by the state it leads to', async () => {
    getSubmissionHistoryMock.mockResolvedValue([
      { ...sampleItems[0], id: 1, latestDecision: 'approved', latestDecisionIsCorrection: false, verificationStatus: 'verified' },
      { ...sampleItems[0], id: 2, latestDecision: 'rejected', latestDecisionIsCorrection: true, verificationStatus: 'verified' },
      { ...sampleItems[0], id: 3, latestDecision: 'needs_changes', latestDecisionIsCorrection: false, verificationStatus: 'changes_requested' },
      { ...sampleItems[0], id: 4, latestDecision: null, latestDecisionIsCorrection: null, verificationStatus: 'pending_review' },
    ])
    useAdminSessionMock.mockReturnValue(signedIn)

    renderPage()

    expect((await screen.findByText('Approved')).className).toContain('status-badge--verified')
    expect(screen.getByText('Correction rejected').className).toContain('status-badge--rejected')
    // A request for changes waits on the contributor, so it shares the Changes requested colour
    expect(screen.getByText('Needs changes').className).toContain('status-badge--changes-requested')
    expect(screen.getByText('Changes requested', { selector: '.status-badge' }).className).toContain('status-badge--changes-requested')
    expect(screen.getByText('Pending review', { selector: '.status-badge' }).className).toContain('status-badge--pending-review')
    expect(screen.getByText('No review recorded').className).not.toContain('status-badge')
    expect(screen.getAllByText('Verified', { selector: '.status-badge' }).every((badge) => badge.className.includes('status-badge--verified'))).toBe(true)
  })

  it('shows how long a record has waited on its contributor', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-15T03:00:00Z'))
    try {
      getSubmissionHistoryMock.mockResolvedValue([
        { ...sampleItems[0], id: 1, verificationStatus: 'changes_requested', latestDecision: 'needs_changes', latestDecisionIsCorrection: false, updatedAt: '2026-10-03T01:00:00Z' },
        { ...sampleItems[0], id: 2, verificationStatus: 'changes_requested', latestDecision: 'needs_changes', latestDecisionIsCorrection: false, updatedAt: '2026-10-15T01:00:00Z' },
        { ...sampleItems[0], id: 3, verificationStatus: 'verified', updatedAt: '2026-10-01T01:00:00Z' },
      ])
      useAdminSessionMock.mockReturnValue(signedIn)
      renderPage()

      expect(await screen.findByText('waiting 12 days')).toBeTruthy()
      expect(screen.getByText('waiting since today')).toBeTruthy()
      expect(screen.getAllByText(/^waiting/)).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('filters by status on the server, starting from the first page', async () => {
    getSubmissionHistoryMock.mockResolvedValue(sampleItems)
    useAdminSessionMock.mockReturnValue(signedIn)

    renderPage()
    await screen.findByText('Example Mine')
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'changes_requested' } })

    await waitFor(() => expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: undefined, sort: 'updated', order: 'desc', status: 'changes_requested' }))
    expect(screen.getByRole('option', { name: 'Changes requested' })).toBeTruthy()
  })

  it('sorts by a column on the server and toggles the order', async () => {
    getSubmissionHistoryMock.mockResolvedValue(sampleItems)
    useAdminSessionMock.mockReturnValue(signedIn)

    renderPage()

    const siteButton = await screen.findByRole('button', { name: 'Sort by Site' })
    expect(screen.getByRole('columnheader', { name: /last updated/i }).getAttribute('aria-sort')).toBe('descending')

    fireEvent.click(siteButton)
    await waitFor(() => expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: undefined, sort: 'site', order: 'asc' }))
    expect((await screen.findByRole('columnheader', { name: /site/i })).getAttribute('aria-sort')).toBe('ascending')

    fireEvent.click(await screen.findByRole('button', { name: 'Sort by Site, ascending' }))
    await waitFor(() => expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: undefined, sort: 'site', order: 'desc' }))
  })

  it('sorts from the small-screen sort menu', async () => {
    getSubmissionHistoryMock.mockResolvedValue(sampleItems)
    useAdminSessionMock.mockReturnValue(signedIn)

    renderPage()

    fireEvent.change(await screen.findByLabelText('Sort by'), { target: { value: 'site:desc' } })
    await waitFor(() => expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith({ limit: 51, offset: 0, q: undefined, sort: 'site', order: 'desc' }))
    expect((screen.getByLabelText('Sort by') as HTMLSelectElement).value).toBe('site:desc')
  })
})
