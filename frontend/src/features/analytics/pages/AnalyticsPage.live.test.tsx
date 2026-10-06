import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getAnalyticsBreakdowns, getAnalyticsCrosstab, getAnalyticsSummary, getAnalyticsTimeline } from '../../../lib/api/analytics'
import type { AnalyticsBreakdownsDto, AnalyticsCrosstabDto, AnalyticsDimension, AnalyticsSummaryDto, AnalyticsTimelineDto } from '../../../lib/api/analytics'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import AnalyticsPage from './AnalyticsPage'

vi.mock('../../../lib/api/analytics', () => ({
  getAnalyticsBreakdowns: vi.fn(),
  getAnalyticsCrosstab: vi.fn(),
  getAnalyticsSummary: vi.fn(),
  getAnalyticsTimeline: vi.fn(),
}))

vi.mock('../../../lib/api/reference-data', () => ({
  getContributionReferenceData: vi.fn(),
}))

const summaryMock = vi.mocked(getAnalyticsSummary)
const breakdownsMock = vi.mocked(getAnalyticsBreakdowns)
const timelineMock = vi.mocked(getAnalyticsTimeline)
const crosstabMock = vi.mocked(getAnalyticsCrosstab)
const referenceMock = vi.mocked(getContributionReferenceData)

const summary: AnalyticsSummaryDto = { machine_count: 42, site_count: 3, country_count: 2 }
const breakdowns: AnalyticsBreakdownsDto = {
  machine_count: 42,
  by_country: [{ key: 'AU', machine_count: 42, share: 1 }],
  by_machine_type: [{ key: 'haul_truck', machine_count: 42, share: 1 }],
  by_manufacturer: [{ key: 'Maker', machine_count: 42, share: 1 }],
  by_supplier: [{ key: 'Supplier', machine_count: 42, share: 1 }],
  by_automation_level: [{ key: null, machine_count: 42, share: 1 }],
  by_status: [{ key: 'operational', machine_count: 42, share: 1 }],
  by_commodity: [{ key: 'gold', machine_count: 42, share: 1 }],
}
const crosstabCells: Record<string, AnalyticsCrosstabDto['cells']> = {
  'supplier:automation_level': [{ row: 'Supplier', column: 'autonomous', machine_count: 42 }],
  'manufacturer:machine_type': [{ row: 'Maker', column: 'haul_truck', machine_count: 42 }],
  'machine_type:environment': [{ row: 'haul_truck', column: 'underground', machine_count: 30 }, { row: 'haul_truck', column: 'surface', machine_count: 12 }],
}

function crosstab(rows: AnalyticsDimension, columns: AnalyticsDimension): Promise<AnalyticsCrosstabDto> {
  const cells = crosstabCells[`${rows}:${columns}`] ?? []
  return Promise.resolve({ rows, columns, machine_count: cells.reduce((total, cell) => total + cell.machine_count, 0), cells })
}

const timeline: AnalyticsTimelineDto = {
  excluded_count: 0,
  excluded_machine_count: 0,
  years: [{ year: 2024, in_service: 42, newly_commissioned: 10 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  summaryMock.mockResolvedValue(summary)
  breakdownsMock.mockResolvedValue(breakdowns)
  timelineMock.mockResolvedValue(timeline)
  crosstabMock.mockImplementation(crosstab)
  referenceMock.mockResolvedValue({
    machineTypes: [['haul_truck', 'Haul truck']],
    environments: [['surface', 'Surface']],
    deploymentStatuses: [['operational', 'Operational']],
    automationLevels: [['autonomous', 'Autonomous']],
    installationTypes: [['unknown', 'Unknown']],
  })
})

describe('AnalyticsPage live API behaviour', () => {
  test('renders API-backed cards and the timeline table alternative', async () => {
    render(<AnalyticsPage />)

    expect(await screen.findByRole('heading', { name: 'Machines by country' })).toBeInTheDocument()
    expect(screen.getByText(/^Showing/)).toHaveTextContent('Showing 42 machines at 3 mine sites in 2 countries')
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /machines by automation level.*unclassified 42 machines, 100%/i })).toBeInTheDocument()

    const timelineCard = screen.getByRole('heading', { name: 'Machines in service over time' }).closest('section')
    expect(timelineCard).not.toBeNull()
    const timelineView = within(timelineCard as HTMLElement)
    const toggle = timelineView.getByRole('button', { name: 'Show as table' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(timelineView.getByRole('button', { name: 'Show chart' })).toHaveAttribute('aria-pressed', 'true')
    expect(timelineView.getByRole('columnheader', { name: 'In service' })).toBeInTheDocument()
    expect(timelineView.getByRole('rowheader', { name: '2024' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All countries' })).toBeInTheDocument()
  })

  test('sends a changed filter to every analytics endpoint', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)
    await screen.findByRole('heading', { name: 'Machines by country' })

    await waitFor(() => expect(screen.getByRole('option', { name: 'Australia' })).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Country'), 'AU')

    await waitFor(() => {
      expect(summaryMock.mock.calls.some(([filters]) => filters?.country === 'AU')).toBe(true)
      expect(breakdownsMock.mock.calls.some(([filters]) => filters?.country === 'AU')).toBe(true)
      expect(timelineMock.mock.calls.some(([filters]) => filters?.country === 'AU')).toBe(true)
    })
  })

  test('lets keyboard users activate country and machine-type chart categories', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)
    await screen.findByRole('heading', { name: 'Machines by country' })

    const countryCategory = await screen.findByRole('button', { name: /^Filter by Australia/ })
    countryCategory.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(summaryMock.mock.calls.some(([filters]) => filters?.country === 'AU')).toBe(true)
    })

    const machineTypeCategory = await screen.findByRole('button', { name: /^Filter by Haul truck/ })
    machineTypeCategory.focus()
    await user.keyboard(' ')
    await waitFor(() => {
      expect(summaryMock.mock.calls.some(([filters]) => filters?.machineType === 'haul_truck')).toBe(true)
    })
  })

  test('leads the timeline with the latest year and the change from the year before', async () => {
    timelineMock.mockResolvedValue({
      excluded_count: 2,
      excluded_machine_count: 5,
      years: [
        { year: 2025, in_service: 30, newly_commissioned: 8 },
        { year: 2026, in_service: 42, newly_commissioned: 12 },
      ],
    })
    const user = userEvent.setup()
    render(<AnalyticsPage />)

    const timelineCard = (await screen.findByRole('heading', { name: 'Machines in service over time' })).closest('section') as HTMLElement
    const timelineView = within(timelineCard)
    expect(timelineView.getByText('machines in service at the end of 2026')).toBeInTheDocument()
    expect(timelineView.getByText('12 more than 2025')).toBeInTheDocument()
    expect(timelineView.getByText('5 machines in 2 records have no commissioning year and are left out.')).toBeInTheDocument()

    await user.click(timelineView.getByRole('button', { name: 'New per year' }))
    expect(screen.getByRole('heading', { name: 'Machines commissioned per year' })).toBeInTheDocument()
    expect(timelineView.getByText('machines commissioned in 2026')).toBeInTheDocument()
    expect(timelineView.getByText('4 more than 2025')).toBeInTheDocument()
  })

  test('filters by supplier, manufacturer and automation level from the charts', async () => {
    const user = userEvent.setup()
    breakdownsMock.mockResolvedValue({ ...breakdowns, by_automation_level: [{ key: 'autonomous', machine_count: 42, share: 1 }] })
    render(<AnalyticsPage />)

    await user.click(await screen.findByRole('button', { name: /^Filter by Supplier/ }))
    await waitFor(() => expect(summaryMock.mock.calls.some(([filters]) => filters?.supplier === 'Supplier')).toBe(true))

    await user.click(await screen.findByRole('button', { name: /^Filter by Maker/ }))
    await waitFor(() => expect(summaryMock.mock.calls.some(([filters]) => filters?.manufacturer === 'Maker')).toBe(true))

    await user.click(await screen.findByRole('button', { name: /^Filter by Autonomous/ }))
    await waitFor(() => expect(summaryMock.mock.calls.some(([filters]) => filters?.automationLevel === 'autonomous')).toBe(true))
  })

  test('only requests the summary, breakdowns and timeline once per filter change', async () => {
    render(<AnalyticsPage />)
    await screen.findByRole('heading', { name: 'Machines by country' })

    expect(summaryMock).toHaveBeenCalledTimes(1)
    expect(crosstabMock).toHaveBeenCalledTimes(3)
    expect(summaryMock.mock.calls.some(([filters]) => Boolean(filters?.status))).toBe(false)
  })

  test('describes the supplier share, heatmap and environment split in text', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)

    expect(await screen.findByRole('button', { name: 'Filter by Supplier: 42 machines, 100%; 100% autonomous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filter by Australia: 42 machines, 100%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filter by Haul truck, 42 machines: 71% underground, 29% surface' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /machines by manufacturer \(rows\) and machine type/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filter by Maker, Haul truck: 42 machines' }))
    await waitFor(() => expect(summaryMock.mock.calls.some(([filters]) => filters?.manufacturer === 'Maker' && filters.machineType === 'haul_truck')).toBe(true))
  })

  test('filters by a commissioning year range and names it in the summary', async () => {
    const user = userEvent.setup()
    timelineMock.mockResolvedValue({ excluded_count: 0, excluded_machine_count: 0, years: [{ year: 2023, in_service: 30, newly_commissioned: 30 }, { year: 2024, in_service: 42, newly_commissioned: 12 }] })
    render(<AnalyticsPage />)
    await screen.findByRole('heading', { name: 'Machines by country' })

    await waitFor(() => expect(screen.getByLabelText('Commissioned from')).toHaveTextContent('2023'))
    await user.selectOptions(screen.getByLabelText('Commissioned from'), '2024')
    await waitFor(() => {
      expect(summaryMock.mock.calls.some(([filters]) => filters?.commissionedFrom === '2024')).toBe(true)
      expect(crosstabMock.mock.calls.some(([, , filters]) => filters?.commissionedFrom === '2024')).toBe(true)
    })
    expect(within(screen.getByLabelText('Commissioned to')).queryByRole('option', { name: '2023' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Commissioned to'), '2024')
    expect(await screen.findByText(/^Showing/)).toHaveTextContent('Showing 42 machines commissioned in 2024 at 3 mine sites in 2 countries')
  })

  test('shows an API error state', async () => {
    summaryMock.mockRejectedValue(new Error('API unavailable'))
    breakdownsMock.mockRejectedValue(new Error('API unavailable'))
    timelineMock.mockRejectedValue(new Error('API unavailable'))

    render(<AnalyticsPage />)

    expect(await screen.findByText(/unable to load analytics/i)).toBeInTheDocument()
  })

  test('shows an empty state from an empty API response', async () => {
    summaryMock.mockResolvedValue({ machine_count: 0, site_count: 0, country_count: 0 })
    breakdownsMock.mockResolvedValue({ ...breakdowns, machine_count: 0, by_country: [], by_machine_type: [], by_manufacturer: [], by_supplier: [], by_automation_level: [], by_status: [], by_commodity: [] })
    timelineMock.mockResolvedValue({ excluded_count: 0, excluded_machine_count: 0, years: [] })

    render(<AnalyticsPage />)

    expect(await screen.findByText(/no analytics available/i)).toBeInTheDocument()
  })
})
