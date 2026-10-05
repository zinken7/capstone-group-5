import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test } from 'vitest'

import AppLayout from './AppLayout'

describe('AppLayout', () => {
  afterEach(() => {
    document.title = ''
  })

  test.each([
    ['/map', 'Map · Mining Market Map'],
    ['/equipment', 'Equipment register · Mining Market Map'],
    ['/admin/deployments/12', 'Admin · Review record · Mining Market Map'],
  ])('sets a route-specific document title for %s', (path, title) => {
    render(<MemoryRouter initialEntries={[path]}><AppLayout><p>Page</p></AppLayout></MemoryRouter>)
    expect(document.title).toBe(title)
  })

  test.each(['/map/unknown', '/equipment/unknown', '/analytics/unknown', '/contribute/unknown', '/admin/unknown'])('uses the not-found title for an unknown nested path: %s', (path) => {
      render(<MemoryRouter initialEntries={[path]}><AppLayout><p>Page</p></AppLayout></MemoryRouter>)
      expect(document.title).toBe('Page not found · Mining Market Map')
    })
})
