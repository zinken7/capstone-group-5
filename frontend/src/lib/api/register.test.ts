import { afterEach, describe, expect, test, vi } from 'vitest'
import { getRegister, getRegisterExport, getRegisterPage } from './register'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getRegister', () => {
  test('serializes server-side filters, sorting and pagination', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ total: 0, limit: 10, offset: 20, items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await getRegisterPage({ siteId: '7', country: 'AU', machineType: 'haul_truck', sort: 'quantity', order: 'desc', limit: 10, offset: 20 })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(url.pathname).toBe('/api/register')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      site_id: '7',
      country: 'AU',
      machine_type: 'haul_truck',
      sort: 'quantity',
      order: 'desc',
      limit: '10',
      offset: '20',
    })
  })

  test('exports the filtered register as CSV', async () => {
    const csv = 'id,site_id\n1,7\n'
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(csv, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getRegisterExport({ siteId: '7', country: 'AU' })
    expect(result.size).toBe(csv.length)

    expect(fetchMock).toHaveBeenCalledWith('/api/register/export?site_id=7&country=AU', expect.objectContaining({
      headers: { Accept: 'text/csv' },
    }))
  })

  test('keeps records with nullable register fields for shared formatting', async () => {
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

    await expect(getRegister()).resolves.toEqual([{
      id: '20202',
      siteName: 'aaaa',
      country: 'AU',
      region: 'Not recorded',
      machineModel: undefined,
      machineType: 'haul_truck',
      manufacturer: 'aaa',
      supplier: 'Caterpillar',
      automationLevel: '',
      environment: 'surface',
      status: 'unknown',
      quantity: 1,
      commissioningDate: undefined,
    }])

    expect(fetchMock).toHaveBeenCalledWith('/api/register?limit=500', expect.objectContaining({
      headers: expect.any(Headers),
    }))
  })

  test('preserves year-only commissioning precision', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      total: 1,
      limit: 500,
      offset: 0,
      items: [{
        id: 1,
        site_name: 'Site',
        country_code: 'AU',
        region: 'Pilbara',
        machine_manufacturer: 'Caterpillar',
        machine_model: null,
        machine_type: 'lhd',
        quantity: 4,
        technology_supplier: null,
        technology_product: null,
        automation_level: 'autonomous',
        environment: null,
        installation_type: 'unknown',
        status: 'operational',
        commissioning_date: null,
        commissioning_year: 2022,
        valid_from: null,
        valid_to: null,
      }],
    })))

    await expect(getRegister()).resolves.toEqual([expect.objectContaining({
      commissioningDate: '2022',
      supplier: 'Not recorded',
      environment: '',
    })])
  })

  test('keeps raw enum values for the shared formatter', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      total: 1,
      limit: 25,
      offset: 0,
      items: [{
        id: 20204,
        site_id: 7,
        site_name: 'Raw enum site',
        country_code: 'AU',
        region: 'Pilbara',
        machine_manufacturer: 'Caterpillar',
        machine_model: null,
        model_variant: null,
        machine_type: 'lhd',
        quantity: 2,
        technology_supplier: 'Caterpillar',
        technology_product: null,
        automation_level: 'semi_autonomous',
        environment: 'both',
        installation_type: 'factory_installed',
        status: 'operational',
        commissioning_date: null,
        commissioning_year: 2024,
        valid_from: null,
        valid_to: null,
      }],
    })))

    await expect(getRegisterPage()).resolves.toEqual(expect.objectContaining({
      records: [expect.objectContaining({
        machineType: 'lhd',
        automationLevel: 'semi_autonomous',
        environment: 'both',
        installationType: 'factory_installed',
      })],
    }))
  })

  test('loads subsequent pages when the register exceeds the API page size', async () => {
    const item = (id: number) => ({
      id,
      site_name: `Site ${id}`,
      country_code: 'AU',
      region: 'Pilbara',
      machine_manufacturer: 'Caterpillar',
      machine_model: '789D',
      model_variant: null,
      machine_type: 'haul_truck',
      quantity: 1,
      technology_supplier: 'Caterpillar',
      technology_product: 'Command for Hauling',
      automation_level: 'autonomous',
      environment: 'surface',
      installation_type: 'factory_installed',
      status: 'operational',
      commissioning_date: null,
      commissioning_year: 2024,
      valid_from: null,
      valid_to: null,
    })
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({
        total: 501,
        limit: 500,
        offset: 0,
        items: Array.from({ length: 500 }, (_, index) => item(index + 1)),
      }))
      .mockResolvedValueOnce(Response.json({
        total: 501,
        limit: 500,
        offset: 500,
        items: [item(501)],
      }))
    vi.stubGlobal('fetch', fetchMock)

    const records = await getRegister()

    expect(records).toHaveLength(501)
    expect(records.at(-1)).toEqual(expect.objectContaining({ id: '501', siteName: 'Site 501' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/register?limit=500&offset=500', expect.objectContaining({
      headers: expect.any(Headers),
    }))
  })
})
