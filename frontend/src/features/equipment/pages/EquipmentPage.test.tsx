import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import EquipmentPage from './EquipmentPage'
import { AdminSessionProvider } from '../../admin/session'
import { fixtureSites } from '../../map/data/fixtureSites'
import { buildEquipmentRecords } from '../presentation'

const records = buildEquipmentRecords(fixtureSites)

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  window.history.replaceState(null, '', '/equipment')
})

const analyticsSummary = { machine_count: 1, site_count: 1, country_count: 1 }
const analyticsBreakdowns = {
  machine_count: 1,
  by_country: [{ key: 'AU', machine_count: 1, share: 1 }],
  by_machine_type: [{ key: 'haul_truck', machine_count: 1, share: 1 }],
  by_manufacturer: [{ key: 'Caterpillar', machine_count: 1, share: 1 }],
  by_supplier: [{ key: 'Caterpillar', machine_count: 1, share: 1 }],
  by_automation_level: [{ key: 'autonomous', machine_count: 1, share: 1 }],
  by_status: [{ key: 'operational', machine_count: 1, share: 1 }],
}

const referenceData = {
  machine_types: ['haul_truck'],
  automation_levels: ['autonomous'],
  environments: ['surface'],
  deployment_statuses: ['operational'],
  installation_types: ['unknown'],
}

describe('EquipmentPage', () => {
  test('renders the equipment register and controls', () => {
    render(<EquipmentPage records={records} />)

    expect(
      screen.getByRole('heading', { name: /^equipment$/i }),
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
      limit: 25,
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
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const path = new URL(String(input), 'http://localhost').pathname
      if (path.endsWith('/reference-data')) return Promise.resolve(Response.json(referenceData))
      if (path.endsWith('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (path.endsWith('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json(registerResponse))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)

    expect(await screen.findByText(/showing 1.*1 of 1/i)).toBeInTheDocument()
    expect(screen.getByText('aaaa')).toBeInTheDocument()
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith('/api/register?sort=site&order=asc&limit=25&offset=0', expect.anything())
  })

  test('formats raw live register enums at the view boundary', async () => {
    const registerResponse = {
      total: 1,
      limit: 25,
      offset: 0,
      items: [{
        id: 20204,
        site_id: 7,
        site_name: 'Raw enum site',
        country_code: 'AU',
        region: 'Pilbara',
        commodity: 'iron_ore',
        machine_manufacturer: 'Caterpillar',
        machine_model: null,
        model_variant: null,
        machine_type: 'lhd',
        quantity: 2,
        technology_supplier: 'Caterpillar',
        technology_product: 'Cat Command',
        automation_level: 'semi_autonomous',
        environment: 'both',
        installation_type: 'factory_installed',
        status: 'operational',
        commissioning_date: '2024',
        commissioning_year: 2024,
        valid_from: null,
        valid_to: null,
      }],
    }
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/reference-data')) return Promise.resolve(Response.json({
        ...referenceData,
        machine_types: ['lhd'],
        automation_levels: ['semi_autonomous'],
        environments: ['both'],
        installation_types: ['factory_installed'],
      }))
      if (url.includes('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (url.includes('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json(registerResponse))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)

    expect((await screen.findAllByText('LHD')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Semi Autonomous')).length).toBeGreaterThan(0)
    const correctButton = screen.getByRole('button', { name: /correct raw enum site/i })
    await userEvent.setup().click(correctButton)
    const environmentSelect = screen.getByRole('combobox', { name: /mining environment/i })
    expect(environmentSelect).toHaveValue('both')
    expect(within(environmentSelect).getByRole('option', { name: 'Surface and underground' })).toBeInTheDocument()
  })

  test('closes the correction dialog from the backdrop, but not after a drag that starts in a field', async () => {
    const user = userEvent.setup()
    const item = { id: 20203, site_id: 7, site_name: 'Backdrop site', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore', machine_manufacturer: 'Caterpillar', machine_model: '793F', model_variant: null, machine_type: 'haul_truck', quantity: 1, technology_supplier: 'Caterpillar', technology_product: 'Cat Command', automation_level: 'autonomous', environment: 'surface', installation_type: 'unknown', status: 'operational', commissioning_date: '2024', commissioning_year: 2024, valid_from: null, valid_to: null }
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/reference-data')) return Promise.resolve(Response.json({ machine_types: ['haul_truck'], automation_levels: ['autonomous'], environments: ['surface'], deployment_statuses: ['operational'], installation_types: ['unknown'] }))
      if (url.includes('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (url.includes('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json({ total: 1, limit: 25, offset: 0, items: [item] }))
    }))

    render(<EquipmentPage />)

    await user.click(await screen.findByRole('button', { name: /correct backdrop site/i }))
    const dialog = screen.getByRole('dialog', { name: /correct this record/i })
    expect(within(dialog).queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    const backdrop = dialog.parentElement as HTMLElement

    // A text selection dragged out of a field ends on the backdrop; that must not close the dialog
    fireEvent.mouseDown(within(dialog).getByRole('textbox', { name: /quantity/i }))
    fireEvent.click(backdrop)
    expect(screen.getByRole('dialog', { name: /correct this record/i })).toBeInTheDocument()

    await user.click(backdrop)
    expect(screen.queryByRole('dialog', { name: /correct this record/i })).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
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
      if (init?.method === 'PATCH') return Promise.resolve(Response.json({ id: 20202, correction_id: 4, verification_status: 'verified' }, { status: 202 }))
      if (url.includes('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (url.includes('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json(registerResponse))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)

    const correctButton = await screen.findByRole('button', { name: /correct correction site/i })
    await user.click(correctButton)
    expect(screen.getByRole('dialog', { name: /correct this record/i })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByRole('textbox', { name: /quantity/i })).toHaveFocus()
    await user.clear(screen.getByRole('textbox', { name: /quantity/i }))
    await user.type(screen.getByRole('textbox', { name: /quantity/i }), '2')
    await user.type(screen.getByRole('textbox', { name: /contact email/i }), 'field@example.com')
    await user.type(screen.getByRole('textbox', { name: /organisation/i }), 'Example Mining')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /submit correction/i }))

    expect(await screen.findByText('Correction submitted for review. The record stays public and unchanged until an administrator approves the change.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /correct correction site/i })).toBeInTheDocument()
    const patchCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/deployments/20202') && init?.method === 'PATCH')
    expect(patchCall?.[1]?.headers).toEqual(expect.objectContaining({ 'X-Requested-With': 'fetch' }))
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual(expect.objectContaining({
      quantity: 2,
      contributor_email: 'field@example.com',
      organisation: 'Example Mining',
      disclosure_accepted: true,
    }))
    expect(document.body.style.overflow).toBe('')
    expect(correctButton).toHaveFocus()
  })

  test('returns focus to the correction trigger when Escape closes the dialog', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/reference-data')) return Promise.resolve(Response.json({ machine_types: ['haul_truck'], automation_levels: ['autonomous'], environments: ['surface'], deployment_statuses: ['operational'], installation_types: ['unknown'] }))
      if (url.includes('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (url.includes('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json({ total: 1, limit: 25, offset: 0, items: [{ id: 20203, site_id: 7, site_name: 'Escape site', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore', machine_manufacturer: 'Caterpillar', machine_model: 'Command truck', model_variant: null, machine_type: 'haul_truck', quantity: 1, technology_supplier: 'Caterpillar', technology_product: 'Cat Command', automation_level: 'autonomous', environment: 'surface', installation_type: 'unknown', status: 'operational', commissioning_date: '2024', commissioning_year: 2024, valid_from: null, valid_to: null }] }))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)
    const correctButton = await screen.findByRole('button', { name: /correct escape site/i })
    await user.click(correctButton)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(correctButton).toHaveFocus()
  })

  test('applies an administrator\'s correction at once instead of proposing it', async () => {
    const user = userEvent.setup()
    const item = { id: 20204, site_id: 7, site_name: 'Admin site', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore', machine_manufacturer: 'Caterpillar', machine_model: '793F', model_variant: null, machine_type: 'haul_truck', quantity: 1, technology_supplier: 'Caterpillar', technology_product: 'Cat Command', automation_level: 'autonomous', environment: 'surface', installation_type: 'unknown', status: 'operational', commissioning_date: '2024', commissioning_year: 2024, valid_from: null, valid_to: null }
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = String(input)
      if (url.endsWith('/admin/session')) return Promise.resolve(Response.json({ email: 'admin@example.com', role: 'admin', must_change_password: false }))
      if (init?.method === 'PATCH') return Promise.resolve(Response.json({ id: 20204, verification_status: 'verified' }))
      if (url.endsWith('/reference-data')) return Promise.resolve(Response.json(referenceData))
      if (url.includes('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (url.includes('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json({ total: 1, limit: 25, offset: 0, items: [item] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const registerCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/register')).length

    render(<MemoryRouter><AdminSessionProvider><EquipmentPage /></AdminSessionProvider></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /correct admin site/i }))
    const dialog = screen.getByRole('dialog', { name: /correct this record/i })
    expect(await within(dialog).findByText('Administrator correction')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /open the record in administration/i })).toHaveAttribute('href', '/admin/deployments/20204')
    expect(within(dialog).queryByRole('textbox', { name: /contact email/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument()

    const loads = registerCalls()
    await user.clear(within(dialog).getByRole('textbox', { name: /quantity/i }))
    await user.type(within(dialog).getByRole('textbox', { name: /quantity/i }), '2')
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }))

    // Nothing is sent until the administrator confirms the listed changes
    let confirm = screen.getByRole('alertdialog', { name: /publish these changes/i })
    expect(within(confirm).getByText('Quantity').closest('div')).toHaveTextContent(/1\s*→\s*changes to\s*2/)
    expect(within(confirm).getByRole('button', { name: /back to editing/i })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /correct this record/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /save changes/i })).toHaveFocus()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)

    await user.click(within(dialog).getByRole('button', { name: /save changes/i }))
    confirm = screen.getByRole('alertdialog', { name: /publish these changes/i })
    await user.click(within(confirm).getByRole('button', { name: /publish changes/i }))

    expect(await screen.findByText('Record updated. The previous values are kept in its history.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const patchCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
    expect(patchCalls).toHaveLength(1)
    expect(String(patchCalls[0][0])).toMatch(/\/admin\/deployments\/20204$/)
    expect(JSON.parse(String(patchCalls[0][1]?.body))).toEqual({ quantity: 2 })
    // The register reloads to show the corrected record
    await waitFor(() => expect(registerCalls()).toBeGreaterThan(loads))
  })

  test('returns an administrator to the form when the backend refuses the change', async () => {
    const user = userEvent.setup()
    const item = { id: 20206, site_id: 7, site_name: 'Refused site', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore', machine_manufacturer: 'Caterpillar', machine_model: '793F', model_variant: null, machine_type: 'haul_truck', quantity: 1, technology_supplier: 'Caterpillar', technology_product: 'Cat Command', automation_level: 'autonomous', environment: 'surface', installation_type: 'unknown', status: 'operational', commissioning_date: '2024', commissioning_year: 2024, valid_from: null, valid_to: null }
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = String(input)
      if (url.endsWith('/admin/session')) return Promise.resolve(Response.json({ email: 'admin@example.com', role: 'admin', must_change_password: false }))
      if (init?.method === 'PATCH') return Promise.resolve(Response.json({ error: 'invalid correction', fields: { commissioning_date: 'must not be after valid_to' } }, { status: 400 }))
      if (url.endsWith('/reference-data')) return Promise.resolve(Response.json(referenceData))
      if (url.includes('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (url.includes('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json({ total: 1, limit: 25, offset: 0, items: [item] }))
    }))

    render(<MemoryRouter><AdminSessionProvider><EquipmentPage /></AdminSessionProvider></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /correct refused site/i }))
    const dialog = screen.getByRole('dialog', { name: /correct this record/i })
    await within(dialog).findByText('Administrator correction')
    const commissioning = within(dialog).getByRole('textbox', { name: /commissioning/i })
    await user.clear(commissioning)
    await user.type(commissioning, '2030')
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /publish changes/i }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('invalid correction')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(commissioning).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText('must not be after valid_to')).toBeInTheDocument()
  })

  test('keeps a signed-out visitor\'s correction a proposal for review', async () => {
    const user = userEvent.setup()
    const item = { id: 20205, site_id: 7, site_name: 'Visitor site', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore', machine_manufacturer: 'Caterpillar', machine_model: '793F', model_variant: null, machine_type: 'haul_truck', quantity: 1, technology_supplier: 'Caterpillar', technology_product: 'Cat Command', automation_level: 'autonomous', environment: 'surface', installation_type: 'unknown', status: 'operational', commissioning_date: '2024', commissioning_year: 2024, valid_from: null, valid_to: null }
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = String(input)
      if (url.endsWith('/admin/session')) return Promise.resolve(Response.json({ error: 'authentication required' }, { status: 401 }))
      if (url.endsWith('/reference-data')) return Promise.resolve(Response.json(referenceData))
      if (url.includes('/analytics/summary')) return Promise.resolve(Response.json(analyticsSummary))
      if (url.includes('/analytics/breakdowns')) return Promise.resolve(Response.json(analyticsBreakdowns))
      return Promise.resolve(Response.json({ total: 1, limit: 25, offset: 0, items: [item] }))
    }))

    render(<MemoryRouter><AdminSessionProvider><EquipmentPage /></AdminSessionProvider></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: /correct visitor site/i }))
    const dialog = screen.getByRole('dialog', { name: /correct this record/i })
    expect(await within(dialog).findByText('Suggest a correction')).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: /contact email/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /submit correction/i })).toBeEnabled()
  })

  test('restores URL state and paginates the live register without a full scan', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/equipment?site_id=7&country=AU&page=2&page_size=10&sort=quantity&order=desc')
    const registerRequests: URL[] = []
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = new URL(String(input), 'http://localhost')
      if (url.pathname.endsWith('/reference-data')) return Promise.resolve(Response.json(referenceData))
      if (url.pathname.endsWith('/analytics/summary')) return Promise.resolve(Response.json({ machine_count: 21, site_count: 1, country_count: 1 }))
      if (url.pathname.endsWith('/analytics/breakdowns')) return Promise.resolve(Response.json({ ...analyticsBreakdowns, machine_count: 21 }))
      if (url.pathname.endsWith('/register')) {
        registerRequests.push(url)
        return Promise.resolve(Response.json({
          total: 21,
          limit: Number(url.searchParams.get('limit')),
          offset: Number(url.searchParams.get('offset')),
          items: [{
            id: 20202,
            site_id: 7,
            site_name: 'Linked site',
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
        }))
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<EquipmentPage />)

    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /country/i })).toHaveValue('AU')
    expect(screen.getByRole('combobox', { name: /rows per page/i })).toHaveValue('10')
    expect(screen.getByRole('button', { name: /sort by quantity, descending/i })).toBeInTheDocument()
    expect(registerRequests[0]?.searchParams.get('site_id')).toBe('7')
    expect(registerRequests[0]?.searchParams.get('offset')).toBe('10')
    expect(registerRequests[0]?.searchParams.get('limit')).toBe('10')
    expect(registerRequests.some((url) => url.searchParams.get('limit') === '500')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText('Page 3 of 3')).toBeInTheDocument())
    expect(registerRequests.at(-1)?.searchParams.get('offset')).toBe('20')
    expect(new URL(window.location.href).searchParams.get('page')).toBe('3')

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeInTheDocument())
    expect(registerRequests.at(-1)?.searchParams.get('offset')).toBe('10')
  })
})
