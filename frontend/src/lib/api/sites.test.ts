import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './errors'
import { getSite } from './sites'
import type { SiteDetailDto } from './types'

const fetchMock = vi.fn<typeof fetch>()
const siteDto: SiteDetailDto = {
  id: 1,
  name: 'Roy Hill',
  country_code: 'AU',
  region: 'Pilbara',
  commodity: 'iron_ore',
  mine_status: 'operating',
  latitude: -22.3,
  longitude: 118.7,
  deployments: [{
    id: 10,
    machine_manufacturer: 'Caterpillar',
    machine_model: 'Caterpillar 793F',
    machine_type: 'haul_truck',
    quantity: 96,
    technology_supplier: 'Caterpillar',
    automation_level: 'autonomous',
    environment: 'surface',
    status: 'operational',
    commissioning_date: '2021-01-01',
    valid_from: '2021-01-01',
    valid_to: null,
  }],
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_BASE_URL', '/api')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('getSite', () => {
  it('requests the site by numeric ID and maps site and deployment fields to camelCase', async () => {
    fetchMock.mockResolvedValue(Response.json(siteDto))

    expect(await getSite(1)).toEqual({
      id: 1,
      name: 'Roy Hill',
      countryCode: 'AU',
      region: 'Pilbara',
      commodity: 'iron_ore',
      mineStatus: 'operating',
      latitude: -22.3,
      longitude: 118.7,
      deployments: [{
        id: 10,
        machineManufacturer: 'Caterpillar',
        machineModel: 'Caterpillar 793F',
        machineType: 'haul_truck',
        quantity: 96,
        technologySupplier: 'Caterpillar',
        automationLevel: 'autonomous',
        environment: 'surface',
        status: 'operational',
        commissioningDate: '2021-01-01',
        validFrom: '2021-01-01',
        validTo: null,
      }],
    })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/sites/1')
  })

  it('preserves nullable fields for presentation code to handle', async () => {
    fetchMock.mockResolvedValue(Response.json({
      ...siteDto,
      region: null,
      deployments: [{ ...siteDto.deployments[0], machine_model: null, commissioning_date: null }],
    }))

    expect(await getSite(1)).toMatchObject({
      region: null,
      deployments: [{ machineModel: null, commissioningDate: null }],
    })
  })

  it('preserves an empty deployments list', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...siteDto, deployments: [] }))
    expect((await getSite(1)).deployments).toEqual([])
  })

  it.each([404, 500])('returns ApiError for HTTP %s', async (status) => {
    const message = status === 404 ? 'site not found' : 'internal server error'
    fetchMock.mockResolvedValue(Response.json({ error: message }, { status }))

    const error = await getSite(999).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status, message })
  })
})
