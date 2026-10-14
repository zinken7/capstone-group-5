import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test } from 'vitest'

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
})
