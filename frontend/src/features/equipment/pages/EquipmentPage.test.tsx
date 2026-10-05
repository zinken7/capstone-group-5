import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import EquipmentPage from './EquipmentPage'
import { fixtureSites } from '../../map/data/fixtureSites'
import { buildEquipmentRecords } from '../presentation'

const records = buildEquipmentRecords(fixtureSites)

afterEach(() => {
  vi.unstubAllGlobals()
})

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
      screen.getByRole('combobox', { name: /commissioning year/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /sort by quantity/i }),
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

    const quantitySortButton = screen.getByRole('button', {
      name: /sort by quantity/i,
    })

    await user.click(quantitySortButton)

    const rows = screen.getAllByRole('row')

    expect(rows.length).toBeGreaterThan(1)
    expect(within(rows[1]).getByText('12')).toBeInTheDocument()
  })

  test('filters by commissioning year', async () => {
    const user = userEvent.setup()

    render(<EquipmentPage records={records} />)

    await user.selectOptions(
      screen.getByRole('combobox', { name: /commissioning year/i }),
      '2021',
    )

    expect(screen.getByText('1 records shown')).toBeInTheDocument()
    expect(screen.getByText('15/03/2021')).toBeInTheDocument()
  })

  test('renders incomplete records returned by the register API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      total: 1,
      limit: 500,
      offset: 0,
      items: [{
        id: 20202,
        site_name: 'aaaa',
        country_code: 'AU',
        region: null,
        commodity: null,
        machine_manufacturer: 'aaa',
        machine_model: null,
        model_variant: null,
        machine_type: 'haul_truck',
        quantity: 1,
        technology_supplier: 'Caterpillar',
        technology_product: 'Cat Command for Hauling',
        automation_level: null,
        environment: 'surface',
        installation_type: 'unknown',
        status: null,
        commissioning_date: null,
        commissioning_year: null,
        valid_from: null,
        valid_to: null,
      }],
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)

    expect(await screen.findByText('1 records shown')).toBeInTheDocument()
    expect(screen.getByText('aaaa')).toBeInTheDocument()
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith('/api/register?limit=500', expect.anything())
  })
})
