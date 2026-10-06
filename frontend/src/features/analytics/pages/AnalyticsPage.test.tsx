import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import AnalyticsPage from './AnalyticsPage'
import { fixtureSites } from '../../map/data/fixtureSites'
import { buildAnalyticsSummary } from '../presentation'
import type { AnalyticsSummary } from '../types'

const summary = buildAnalyticsSummary(fixtureSites)

describe('AnalyticsPage', () => {
  test('renders headline analytics and breakdowns', () => {
    render(<AnalyticsPage summary={summary} />)

    expect(
      screen.getByRole('heading', { name: 'Analytics' }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(/^Showing/),
    ).toHaveTextContent('Showing 25 machines at 3 mine sites in 1 country.')

    expect(
      screen.queryByText('Automated machines'),
    ).not.toBeInTheDocument()

    for (const name of ['Machines in service over time', 'Machines by automation level', 'Machines by country', 'Machines by technology supplier', 'Machines by manufacturer and type', 'Underground or surface, by machine type', 'Machines by commodity']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })

  test('shows an empty state when there are no analytics records', () => {
    const emptySummary: AnalyticsSummary = {
      machineCount: 0,
      siteCount: 0,
      countryCount: 0,
      machinesByType: [],
      machinesByCountry: [],
      machinesByAutomationLevel: [],
      machinesBySupplier: [],
    }

    render(<AnalyticsPage summary={emptySummary} />)

    expect(
      screen.getByText(/no analytics available/i),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /analytics will appear when equipment records are available/i,
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(/^Showing/),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByRole('heading', { name: /machines by country/i }),
    ).not.toBeInTheDocument()
  })
})
