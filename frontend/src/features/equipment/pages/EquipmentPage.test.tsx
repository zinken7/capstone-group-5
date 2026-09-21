import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import EquipmentPage from './EquipmentPage'
import { fixtureSites } from '../../map/data/fixtureSites'
import { buildEquipmentRecords } from '../presentation'

const records = buildEquipmentRecords(fixtureSites)

describe('EquipmentPage', () => {
  test('renders the equipment register and controls', () => {
    render(<EquipmentPage records={records} />)

    expect(
      screen.getByRole('heading', { name: /equipment register/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('searchbox', { name: /search/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('combobox', { name: /supplier/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('combobox', { name: /status/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('combobox', { name: /sort by/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /export csv/i }),
    ).toBeEnabled()
  })

  test('filters equipment using search', async () => {
    const user = userEvent.setup()

    render(<EquipmentPage records={records} />)

    const searchInput = screen.getByRole('searchbox', {
      name: /search/i,
    })

    await user.type(searchInput, 'Atlas Automation')

    expect(
      screen.getByText(/records shown/i),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(/no matching equipment/i),
    ).not.toBeInTheDocument()
  })

  test('filters by supplier', async () => {
    const user = userEvent.setup()

    render(<EquipmentPage records={records} />)

    const supplierSelect = screen.getByRole('combobox', {
      name: /supplier/i,
    })

    await user.selectOptions(supplierSelect, 'Atlas Automation')

    const table = screen.getByRole('table')

    expect(
      within(table).getAllByText('Atlas Automation').length,
    ).toBeGreaterThan(0)
  })

  test('shows empty state when search has no matches', async () => {
    const user = userEvent.setup()

    render(<EquipmentPage records={records} />)

    const searchInput = screen.getByRole('searchbox', {
      name: /search/i,
    })

    await user.type(searchInput, 'Definitely Not A Real Equipment Record')

    expect(
      screen.getByText('0 records shown'),
    ).toBeInTheDocument()

    expect(
      screen.getByText(/no matching equipment/i),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /export csv/i }),
    ).toBeDisabled()
  })

  test('changes sorting order', async () => {
    const user = userEvent.setup()

    render(<EquipmentPage records={records} />)

    const sortSelect = screen.getByRole('combobox', {
      name: /sort by/i,
    })

    await user.selectOptions(sortSelect, 'quantity-desc')

    const rows = screen.getAllByRole('row')

    expect(rows.length).toBeGreaterThan(1)
  })
})