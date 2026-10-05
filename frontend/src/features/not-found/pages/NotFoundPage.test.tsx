import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import NotFoundPage from './NotFoundPage'

describe('NotFoundPage', () => {
  test('shows the requested path and recovery links', () => {
    render(<MemoryRouter initialEntries={['/missing-record']}><NotFoundPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /could not find/i })).toBeInTheDocument()
    expect(screen.getByText('/missing-record')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open map/i })).toHaveAttribute('href', '/map')
  })
})
