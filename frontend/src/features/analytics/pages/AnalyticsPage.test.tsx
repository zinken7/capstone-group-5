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
      screen.getByText('Automated machines'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Mine sites'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Countries'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: /machines by type/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: /machines by country/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: /machines by automation level/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: /machines by technology supplier/i }),
    ).toBeInTheDocument()
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
      screen.queryByText('Automated machines'),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByRole('heading', { name: /machines by type/i }),
    ).not.toBeInTheDocument()
  })
})
