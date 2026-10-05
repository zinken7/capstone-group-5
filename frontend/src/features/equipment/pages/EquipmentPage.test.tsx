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
    const registerResponse = {
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
    }
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(Response.json(registerResponse)))
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)

    expect(await screen.findByText(/showing 1.*1 of 1/i)).toBeInTheDocument()
    expect(screen.getByText('aaaa')).toBeInTheDocument()
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith('/api/register?limit=500', expect.anything())
  })

  test('opens the correction dialog and submits a pending-review correction', async () => {
    const user = userEvent.setup()
    const registerResponse = {
      total: 1,
      limit: 25,
      offset: 0,
      items: [{
        id: 20202,
        site_id: 7,
        site_name: 'Correction site',
        country_code: 'AU',
        region: 'Pilbara',
        commodity: 'iron_ore',
        machine_manufacturer: 'Caterpillar',
        machine_model: 'Command truck',
        model_variant: null,
        machine_type: 'haul_truck',
        quantity: 1,
        technology_supplier: 'Caterpillar',
        technology_product: 'Cat Command',
        automation_level: 'autonomous',
        environment: 'surface',
        installation_type: 'unknown',
        status: 'operational',
        commissioning_date: '2024',
        commissioning_year: 2024,
        valid_from: null,
        valid_to: null,
      }],
    }
    const referenceResponse = {
      machine_types: ['haul_truck'],
      automation_levels: ['autonomous'],
      environments: ['surface'],
      deployment_statuses: ['operational'],
      installation_types: ['unknown'],
    }
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = String(input)
      if (url.endsWith('/reference-data')) return Promise.resolve(Response.json(referenceResponse))
      if (init?.method === 'PATCH') return Promise.resolve(Response.json({ id: 20202, verification_status: 'pending_review' }))
      return Promise.resolve(Response.json(registerResponse))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)

    await user.click(await screen.findByRole('button', { name: /correct correction site/i }))
    expect(screen.getByRole('dialog', { name: /correct this record/i })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: /quantity/i }))
    await user.type(screen.getByRole('textbox', { name: /quantity/i }), '2')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /submit correction/i }))

    expect(await screen.findByText(/correction submitted for review/i)).toBeInTheDocument()
    const patchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/deployments/20202') && init?.method === 'PATCH')
    expect(patchCall?.[1]?.headers).toEqual(expect.objectContaining({ 'X-Requested-With': 'fetch' }))
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual(expect.objectContaining({ quantity: 2, disclosure_accepted: true }))
  })
})
