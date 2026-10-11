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

afterEach(() => {
  vi.clearAllMocks()
})

describe('AdminSubmissionHistoryPage', () => {
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
    expect(screen.getByText('verified')).toBeTruthy()
    expect(getSubmissionHistoryMock).toHaveBeenCalledWith(50, 0, undefined)
  })

  it('searches by submission ID', async () => {
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

    await screen.findByText('Example Mine')

    fireEvent.change(screen.getByLabelText('Submission ID'), {
      target: { value: '12' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(getSubmissionHistoryMock).toHaveBeenLastCalledWith(50, 0, 12)
    })
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
})
