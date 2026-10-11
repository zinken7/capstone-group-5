import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Map as LeafletMap, point } from 'leaflet'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import MapPage from './MapPage'

// The real outlines are 100 kB of TopoJSON; an empty layer still carries the attribution
vi.mock('../basemap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../basemap')>()),
  loadCountries: async () => ({ type: 'FeatureCollection', features: [] }),
}))

const currentYear = new Date().getFullYear()

const feature = (id: number, name: string, countryCode: string, coordinates: [number, number], machines: number, status = 'operational') => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties: {
    id, name, country_code: countryCode, region: countryCode === 'AU' ? 'Pilbara' : 'Norrbotten', commodity: 'iron_ore',
    status, technology_suppliers: countryCode === 'AU' ? ['Caterpillar'] : ['Sandvik'], machine_count: machines, deployment_count: 1,
  },
})

const ROY_HILL = feature(1, 'Roy Hill', 'AU', [118.7, -22.3], 96)
const KIRUNA = feature(2, 'Kiruna', 'SE', [20.2, 67.9], 12)
const mapResponse = (features: unknown[], excluded = 0) => Response.json({ type: 'FeatureCollection', excluded_count: excluded, features })

const REFERENCE_DATA = {
  machine_types: ['haul_truck', 'lhd', 'shovel'],
  automation_levels: ['operator_assistance', 'teleremote', 'semi_autonomous', 'autonomous'],
  environments: ['surface', 'underground', 'both'],
  deployment_statuses: ['announced', 'commissioning', 'operational', 'decommissioned'],
  installation_types: ['factory_installed', 'retrofit', 'unknown'],
}

const SITE_DETAIL = {
  id: 1, name: 'Roy Hill', country_code: 'AU', region: 'Pilbara', commodity: 'iron_ore', mine_status: 'operating',
  latitude: -22.3, longitude: 118.7,
  deployments: [
    {
      id: 10, machine_manufacturer: 'Caterpillar', machine_model: '793F', machine_type: 'haul_truck', quantity: 96,
      technology_supplier: 'Caterpillar', automation_level: 'autonomous', environment: 'surface', status: 'operational',
      commissioning_date: '2021-01-01', commissioning_year: 2021, valid_from: '2021-01-01', valid_to: null,
    },
    {
      id: 14, machine_manufacturer: 'Caterpillar', machine_model: '777F', machine_type: 'haul_truck', quantity: 20,
      technology_supplier: 'Caterpillar', automation_level: null, environment: 'surface', status: 'decommissioned',
      commissioning_date: '2015-03-01', commissioning_year: 2015, valid_from: '2015-03-01', valid_to: '2020-12-31',
    },
  ],
}

type Handler = (url: URL) => Response | Promise<Response>
let mapCalls: URLSearchParams[] = []

/** Stubs the API. The unfiltered map request feeds the filter options; filtered ones go to `onMap`. */
function stubApi(onMap: Handler = () => mapResponse([ROY_HILL, KIRUNA]), extra: Record<string, Handler> = {}) {
  mapCalls = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname === '/api/map') {
      if (!url.search) return mapResponse([ROY_HILL, KIRUNA])
      mapCalls.push(url.searchParams)
      return onMap(url)
    }
    const handler = extra[url.pathname] ?? {
      '/api/reference-data': () => Response.json(REFERENCE_DATA),
      '/api/analytics/timeline': () => Response.json({ years: [{ year: 2014, newly_commissioned: 20, in_service: 20 }, { year: currentYear, newly_commissioned: 0, in_service: 108 }] }),
      '/api/sites/1': () => Response.json(SITE_DETAIL),
    }[url.pathname]
    return handler ? handler(url) : Response.json({ error: `unexpected request ${url.pathname}` }, { status: 500 })
  }))
}

const lastMapCall = () => Object.fromEntries(mapCalls[mapCalls.length - 1] ?? [])

function renderMap() {
  return render(<MemoryRouter><MapPage /></MemoryRouter>)
}

beforeEach(() => {
  stubApi()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MapPage', () => {
  test('shows the sites in service at the end of the current year, with totals and an alphabetical list', async () => {
    renderMap()

    const list = await screen.findByRole('region', { name: /sites in view/i })
    expect(lastMapCall()).toEqual({ year: String(currentYear) })
    expect(within(list).getAllByRole('button').map((button) => button.textContent)).toEqual([
      expect.stringContaining('Kiruna'),
      expect.stringContaining('Roy Hill'),
    ])
    expect(within(list).getByRole('button', { name: /roy hill/i })).toHaveTextContent('Operational')
    const totals = screen.getByLabelText('Totals for the current view')
    expect(within(totals).getByText('108')).toBeInTheDocument()
    expect(within(totals).getByText('countries')).toBeInTheDocument()
    expect(document.querySelector('.map-panel__count')).toHaveTextContent('2 sites · 108 machines in service')
  })

  test('offers every machine type from the reference data and sends the chosen filters', async () => {
    const user = userEvent.setup()
    renderMap()
    const machineType = await screen.findByLabelText('Machine type')
    await waitFor(() => expect(within(machineType).getByRole('option', { name: 'Shovel' })).toBeInTheDocument())

    await user.selectOptions(machineType, 'shovel')
    await user.click(screen.getByRole('radio', { name: 'Autonomous' }))
    await user.selectOptions(screen.getByLabelText('Country'), 'SE')
    await user.click(screen.getByRole('checkbox', { name: /include decommissioned deployments/i }))

    await waitFor(() => expect(lastMapCall()).toEqual({
      machine_type: 'shovel', automation_level: 'autonomous', country: 'SE', year: String(currentYear), include_decommissioned: 'true',
    }))

    await user.click(screen.getByRole('button', { name: /clear all/i }))
    await waitFor(() => expect(lastMapCall()).toEqual({ year: String(currentYear) }))
    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled()
  })

  test('requests a year once the slider settles and says how many deployments have no year', async () => {
    stubApi((url) => mapResponse([ROY_HILL], url.searchParams.get('year') === '2020' ? 2 : 0))
    renderMap()
    const slider = await screen.findByLabelText('Deployments in service at the end of')

    fireEvent.change(slider, { target: { value: '2020' } })

    await waitFor(() => expect(lastMapCall()).toEqual({ year: '2020' }))
    expect(await screen.findByText('2 deployments have no commissioning year and are not on the map.')).toBeInTheDocument()
    expect(slider).toHaveAttribute('min', '2014')
  })

  test('keeps the current sites and counts steady while new results load', async () => {
    let release: (response: Response) => void = () => undefined
    let calls = 0
    stubApi(() => {
      calls += 1
      return calls === 1 ? mapResponse([ROY_HILL, KIRUNA]) : new Promise<Response>((resolve) => { release = resolve })
    })
    const user = userEvent.setup()
    renderMap()
    await screen.findByRole('button', { name: /kiruna/i })

    await user.selectOptions(screen.getByLabelText('Country'), 'AU')

    // A slow request earns a loading bar after a short delay; the old sites stay meanwhile
    expect(screen.queryByText('Updating the map…')).not.toBeInTheDocument()
    expect(await screen.findByText('Updating the map…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /kiruna/i })).toBeInTheDocument()
    expect(document.querySelector('.map-panel__count')).toHaveTextContent('2 sites · 108 machines in service')
    release(mapResponse([ROY_HILL]))
    await waitFor(() => expect(screen.queryByRole('button', { name: /kiruna/i })).not.toBeInTheDocument())
    expect(screen.queryByText('Updating the map…')).not.toBeInTheDocument()
  })

  test('opens a site card from the list with what is in service and links to the register', async () => {
    const user = userEvent.setup()
    
    const panTo = vi.spyOn(LeafletMap.prototype, 'panTo')
    const panInside = vi.spyOn(LeafletMap.prototype, 'panInside').mockImplementation(function (this: LeafletMap) { return this })
    const flyTo = vi.spyOn(LeafletMap.prototype, 'flyTo')
    vi.spyOn(LeafletMap.prototype, 'getSize').mockReturnValue(point(390, 544))

    renderMap()

    const site = await screen.findByRole('button', { name: /roy hill/i })
    await user.click(site)

    expect(panTo).not.toHaveBeenCalled()
    expect(flyTo.mock.calls[0]).toEqual([[-22.3, 118.7], expect.any(Number), expect.objectContaining({ duration: 0.6 })])
    expect(panInside).toHaveBeenCalledWith([-22.3, 118.7], expect.objectContaining({
      paddingTopLeft: expect.any(Array),
      paddingBottomRight: expect.any(Array),
    }))

    const card = await screen.findByRole('article', { name: 'Roy Hill' })
    expect(document.querySelector('.map-stage')).toHaveClass('map-stage--selected')
    const legendToggle = screen.getByRole('button', { name: 'Show legend' })
    await user.click(legendToggle)
    expect(legendToggle).toHaveAttribute('aria-expanded', 'true')
    expect(document.querySelector('.map-legend')).toHaveClass('map-legend--mobile-open')
    
    await user.click(within(card).getByRole('button', { name: /zoom to site/i }))
    expect(flyTo).toHaveBeenCalled()

    expect(site).toHaveAttribute('aria-pressed', 'true')
    expect(await within(card).findByText('Caterpillar 793F')).toBeInTheDocument()
    expect(within(card).queryByText('Caterpillar 777F')).not.toBeInTheDocument()
    expect(within(card).getByText(/1 decommissioned deployment \(20 machines\) is hidden/)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /view in register/i })).toHaveAttribute('href', '/equipment?site_id=1')

    await user.click(within(card).getByRole('button', { name: /close site details/i }))
    expect(screen.queryByRole('article', { name: 'Roy Hill' })).not.toBeInTheDocument()
    expect(document.querySelector('.map-stage')).not.toHaveClass('map-stage--selected')
    expect(screen.queryByRole('button', { name: 'Show legend' })).not.toBeInTheDocument()
    expect(site).toHaveFocus()
  })

  test('focuses a site from the map marker instead of refitting to all sites', async () => {
    const flyTo = vi.spyOn(LeafletMap.prototype, 'flyTo')
    vi.spyOn(LeafletMap.prototype, 'getSize').mockReturnValue(point(1200, 700))
    vi.spyOn(LeafletMap.prototype, 'getZoom').mockReturnValue(2)

    renderMap()
    await screen.findByRole('button', { name: /roy hill/i })

    const markers = document.querySelectorAll('.site-marker')
    expect(markers.length).toBeGreaterThan(0)
    fireEvent.click(markers[0] as Element)

    expect(await screen.findByRole('article')).toHaveAccessibleName('Kiruna')
    expect(flyTo).toHaveBeenCalledWith([67.9, 20.2], 5, { duration: 0.6 })
  })

  test('keeps the selected zoom when the details panel changes the map size', async () => {
    let triggerResize: (() => void) | undefined
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) {
        triggerResize = callback
      }
      observe() {}
      disconnect() {}
    })
    const fitBounds = vi.spyOn(LeafletMap.prototype, 'fitBounds')
    vi.spyOn(LeafletMap.prototype, 'getSize').mockReturnValue(point(1200, 700))
    vi.spyOn(LeafletMap.prototype, 'getZoom').mockReturnValue(2)

    renderMap()
    await screen.findByRole('button', { name: /roy hill/i })

    await waitFor(() => {
      expect(fitBounds).toHaveBeenCalled()
    })

    const overviewFits = fitBounds.mock.calls.length

    await userEvent.setup().click(await screen.findByRole('button', { name: /roy hill/i }))
    await screen.findByRole('article', { name: 'Roy Hill' })
    triggerResize?.()

    expect(fitBounds.mock.calls.length).toBe(overviewFits)
  })

  test('keeps the selected site in the visible area on a 320px phone map', async () => {
    const user = userEvent.setup()
    const panTo = vi.spyOn(LeafletMap.prototype, 'panTo')
    const panInside = vi.spyOn(LeafletMap.prototype, 'panInside').mockImplementation(function (this: LeafletMap) { return this })
    vi.spyOn(LeafletMap.prototype, 'getSize').mockReturnValue(point(320, 544))

    renderMap()
    await user.click(await screen.findByRole('button', { name: /roy hill/i }))
    await screen.findByRole('article', { name: 'Roy Hill' })

    expect(panTo).not.toHaveBeenCalled()
    expect(panInside).toHaveBeenCalledWith([-22.3, 118.7], expect.objectContaining({
      paddingTopLeft: expect.any(Array),
      paddingBottomRight: expect.any(Array),
    }))
  })

  test('lists ended deployments in the card when decommissioned deployments are included', async () => {
    const user = userEvent.setup()
    renderMap()

    await user.click(await screen.findByRole('checkbox', { name: /include decommissioned deployments/i }))
    await user.click(await screen.findByRole('button', { name: /roy hill/i }))

    const card = await screen.findByRole('article', { name: 'Roy Hill' })
    expect(await within(card).findByText('Caterpillar 777F')).toBeInTheDocument()
    expect(within(card).queryByText(/is hidden/)).not.toBeInTheDocument()
  })

  test('shows an error with a retry, and an empty state that clears the filters', async () => {
    let calls = 0
    stubApi(() => {
      calls += 1
      if (calls === 1) return Response.json({ error: 'service unavailable' }, { status: 503 })
      return mapResponse([])
    })
    const user = userEvent.setup()
    renderMap()

    expect(await screen.findByRole('alert')).toHaveTextContent('The map could not load: service unavailable')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('No sites match these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
  })

  test('collapses and reopens the panel', async () => {
    const user = userEvent.setup()
    renderMap()
    await screen.findByRole('button', { name: /roy hill/i })

    await user.click(screen.getByRole('button', { name: 'Hide filters and sites' }))
    expect(screen.queryByLabelText('Machine type')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show filters and sites/i })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: /show filters and sites/i }))
    expect(screen.getByLabelText('Machine type')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide filters and sites' })).toHaveFocus()
  })

  test('draws a Natural Earth base map and requests no map tiles', async () => {
    renderMap()
    await screen.findByRole('button', { name: /roy hill/i })

    await waitFor(() => expect(document.querySelector('.leaflet-control-attribution')).toHaveTextContent('Natural Earth'))
    expect(document.querySelector('.leaflet-tile, img[src*="openstreetmap"]')).toBeNull()
  })
})
