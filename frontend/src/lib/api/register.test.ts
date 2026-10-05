import { afterEach, describe, expect, test, vi } from 'vitest'
import { getRegister } from './register'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getRegister', () => {
  test('keeps records with nullable register fields and labels them as not recorded', async () => {
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
      machineType: 'Haul Truck',
      manufacturer: 'aaa',
      supplier: 'Caterpillar',
      automationLevel: 'Not recorded',
      environment: 'Surface',
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
      environment: 'Not recorded',
    })])
  })
})
