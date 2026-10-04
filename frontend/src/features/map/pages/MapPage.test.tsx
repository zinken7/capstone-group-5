import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import MapPage from './MapPage'
import { densityFixtureSites, fixtureSites } from '../data/fixtureSites'

describe('MapPage supplier filtering', () => {
  test('shows all sites before filtering', () => {
    render(<MapPage sites={fixtureSites} />)

    expect(
      screen.getByRole('heading', {
        name: /autonomous mining equipment market map/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('1 site shown')).toBeInTheDocument()

    expect(
      screen.getByRole('checkbox', { name: /show decommissioned records/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('combobox', {
        name: /technology supplier/i,
      }),
    ).toBeInTheDocument()
  })

  test('filters sites by technology supplier', async () => {
    const user = userEvent.setup()

    render(<MapPage sites={fixtureSites} />)

    await user.click(screen.getByRole('checkbox', { name: /show decommissioned records/i }))

    const supplierFilter = screen.getByRole('combobox', {
      name: /technology supplier/i,
    })

    await user.selectOptions(supplierFilter, 'TerraNav Systems')

    expect(screen.getByText('2 sites shown')).toBeInTheDocument()

    expect(
      screen.queryByText(/no matching sites/i),
    ).not.toBeInTheDocument()
  })

  test('can reveal decommissioned sites', async () => {
    const user = userEvent.setup()

    render(<MapPage sites={fixtureSites} />)

    await user.click(screen.getByRole('checkbox', { name: /show decommissioned records/i }))

    expect(screen.getByText('2 sites shown')).toBeInTheDocument()
  })

  test('includes a 51+ fixture for the high-density state', () => {
    render(<MapPage sites={densityFixtureSites} />)

    expect(screen.getByText('Pilbara High Density Demo Site').closest('li')).toHaveTextContent('60 verified machines')
    expect(document.querySelector('path[fill="#7c3aed"]')).toBeInTheDocument()
  })

  test('shows an empty state when no machine type matches', async () => {
    const user = userEvent.setup()

    render(<MapPage sites={fixtureSites} />)

    const machineTypeFilter = screen.getByRole('combobox', {
      name: /machine type/i,
    })

    await user.selectOptions(machineTypeFilter, 'lhd')

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
