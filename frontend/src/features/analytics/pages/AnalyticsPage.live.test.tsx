import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getAnalyticsBreakdowns, getAnalyticsSummary, getAnalyticsTimeline } from '../../../lib/api/analytics'
import type { AnalyticsBreakdownsDto, AnalyticsSummaryDto, AnalyticsTimelineDto } from '../../../lib/api/analytics'
import { getContributionReferenceData } from '../../../lib/api/reference-data'
import AnalyticsPage from './AnalyticsPage'

vi.mock('../../../lib/api/analytics', () => ({
  getAnalyticsBreakdowns: vi.fn(),
  getAnalyticsSummary: vi.fn(),
  getAnalyticsTimeline: vi.fn(),
}))

vi.mock('../../../lib/api/reference-data', () => ({
  getContributionReferenceData: vi.fn(),
}))

const summaryMock = vi.mocked(getAnalyticsSummary)
const breakdownsMock = vi.mocked(getAnalyticsBreakdowns)
const timelineMock = vi.mocked(getAnalyticsTimeline)
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

    expect(await screen.findByText('Technology suppliers')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Machines by country' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /machines by automation level.*unclassified/i })).toBeInTheDocument()

    const timelineCard = screen.getByRole('heading', { name: 'Machines in service over time' }).closest('section')
    expect(timelineCard).not.toBeNull()
    const timelineView = within(timelineCard as HTMLElement)
    const toggle = timelineView.getByRole('button', { name: 'Show as table' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(timelineView.getByRole('button', { name: 'Show chart' })).toHaveAttribute('aria-pressed', 'true')
    expect(timelineView.getByRole('columnheader', { name: 'Machines' })).toBeInTheDocument()
    expect(timelineView.getByText('2024')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All countries' })).toBeInTheDocument()
  })

  test('sends a changed filter to every analytics endpoint', async () => {
    const user = userEvent.setup()
    render(<AnalyticsPage />)
    await screen.findByText('Technology suppliers')

    await waitFor(() => expect(screen.getByRole('option', { name: 'Australia' })).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Country'), 'AU')

    await waitFor(() => {
      expect(summaryMock.mock.calls.some(([filters]) => filters?.country === 'AU')).toBe(true)
      expect(breakdownsMock.mock.calls.some(([filters]) => filters?.country === 'AU')).toBe(true)
      expect(timelineMock.mock.calls.some(([filters]) => filters?.country === 'AU')).toBe(true)
    })
  })

  test('keeps status mix requests separate from the FR-27 filters', async () => {
    render(<AnalyticsPage />)
    await screen.findByText('Technology suppliers')

    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    await waitFor(() => {
      const statusRequests = summaryMock.mock.calls.filter(([filters]) => Boolean(filters?.status))
      expect(statusRequests.map(([filters]) => filters?.status)).toEqual(expect.arrayContaining(['operational', 'commissioning', 'announced', 'decommissioned']))
      expect(statusRequests.every(([filters]) => filters?.country === undefined)).toBe(true)
    })
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
    breakdownsMock.mockResolvedValue({ ...breakdowns, machine_count: 0, by_country: [], by_machine_type: [], by_manufacturer: [], by_supplier: [], by_automation_level: [], by_status: [] })
    timelineMock.mockResolvedValue({ excluded_count: 0, excluded_machine_count: 0, years: [] })

    render(<AnalyticsPage />)

    expect(await screen.findByText(/no analytics available/i)).toBeInTheDocument()
  })
})
