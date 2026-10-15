import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { MyContributionsProvider, STORAGE_KEY } from '../features/contribute/my-contributions'
import AppLayout from './AppLayout'

describe('AppLayout', () => {
  afterEach(() => {
    document.title = ''
  })

  test.each([
    ['/map', 'Map · Mining Market Map'],
    ['/equipment', 'Equipment · Mining Market Map'],
    ['/admin/submissions', 'Admin · Submission history · Mining Market Map'],
    ['/admin/deployments/12', 'Admin · Review record · Mining Market Map'],
    ['/admin/users', 'Admin · Administrators · Mining Market Map'],
  ])('sets a route-specific document title for %s', (path, title) => {
    render(<MemoryRouter initialEntries={[path]}><AppLayout><p>Page</p></AppLayout></MemoryRouter>)
    expect(document.title).toBe(title)
  })

  test('links to administrator sign-in from the footer, not from the main navigation', () => {
    render(<MemoryRouter initialEntries={['/map']}><AppLayout><p>Page</p></AppLayout></MemoryRouter>)

    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Administrator sign-in' })).toHaveAttribute('href', '/admin')
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/')
    expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })

  test.each(['/admin', '/admin/login', '/admin/deployments/12'])('gives the administration pages no public header or footer: %s', (path) => {
    render(<MemoryRouter initialEntries={[path]}><AppLayout><p>Page</p></AppLayout></MemoryRouter>)

    expect(screen.getByText('Page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Administrator sign-in' })).not.toBeInTheDocument()
  })

  test.each(['/map/unknown', '/equipment/unknown', '/analytics/unknown', '/contribute/unknown', '/admin/unknown'])('uses the not-found title for an unknown nested path: %s', (path) => {
      render(<MemoryRouter initialEntries={[path]}><AppLayout><p>Page</p></AppLayout></MemoryRouter>)
      expect(document.title).toBe('Page not found · Mining Market Map')
    })

  test('shows on the Contribute link how many submissions from this browser need changes', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 20412, key: 'k'.repeat(43), siteName: 'Ashgrove Mine', machine: 'Caterpillar 793F', submittedAt: '2026-10-02T03:00:00.000Z' },
    ]))
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [{
      id: 20412, verification_status: 'changes_requested', site_id: 7, site_name: 'Ashgrove Mine', country_code: 'AU',
      machine_manufacturer: 'Caterpillar', machine_model: '793F', machine_type: 'haul_truck', quantity: 12,
      submitted_at: '2026-10-02T03:00:00.000Z', updated_at: '2026-10-09T03:00:00.000Z', resubmission_of: null, resubmitted_as: null,
      decision: { decision: 'needs_changes', note: 'Add a source', decided_at: '2026-10-09T03:00:00.000Z' },
    }] })))
    try {
      render(<MemoryRouter initialEntries={['/map']}><MyContributionsProvider><AppLayout><p>Page</p></AppLayout></MyContributionsProvider></MemoryRouter>)

      const link = await screen.findByRole('link', { name: 'Contribute, 1 submission needs changes' })
      expect(link).toHaveAttribute('href', '/contribute?tab=mine')
      expect(within(link).getByText('1')).toHaveClass('nav-badge')
    } finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })
})
