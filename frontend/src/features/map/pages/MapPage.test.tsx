import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import MapPage from './MapPage'
import { fixtureSites } from '../data/fixtureSites'

describe('MapPage supplier filtering', () => {
  test('shows all sites before filtering', () => {
    render(<MapPage sites={fixtureSites} />)

    expect(
      screen.getByRole('heading', {
        name: /autonomous mining equipment market map/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('3 sites shown')).toBeInTheDocument()

    expect(
      screen.getByRole('combobox', {
        name: /filter by technology supplier/i,
      }),
    ).toBeInTheDocument()
  })

  test('filters sites by technology supplier', async () => {
    const user = userEvent.setup()

    render(<MapPage sites={fixtureSites} />)

    const supplierFilter = screen.getByRole('combobox', {
      name: /filter by technology supplier/i,
    })

    await user.type(supplierFilter, 'Atlas Automation')

    expect(screen.getByText('1 site shown')).toBeInTheDocument()

    expect(
      screen.queryByText(/no matching sites/i),
    ).not.toBeInTheDocument()
  })

  test('shows an empty state when no supplier matches', async () => {
    const user = userEvent.setup()

    render(<MapPage sites={fixtureSites} />)

    const supplierFilter = screen.getByRole('combobox', {
      name: /filter by technology supplier/i,
    })

    await user.type(supplierFilter, 'Supplier That Does Not Exist')

    expect(screen.getByText('0 sites shown')).toBeInTheDocument()

    expect(
      screen.getByText(/no matching sites/i),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /try a different supplier name or clear the filter/i,
      ),
    ).toBeInTheDocument()
  })
})