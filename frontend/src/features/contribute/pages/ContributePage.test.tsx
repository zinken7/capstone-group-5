import { render as renderUi, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import ContributePage from './ContributePage'
import { DEFAULT_CONTRIBUTION_REFERENCE_DATA } from '../types'

afterEach(() => {
  vi.unstubAllGlobals()
})

// The page keeps its tab in the address, so it renders inside a router
const render = (ui: ReactElement) => renderUi(ui, { wrapper: MemoryRouter })

async function fillMinimumForm() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/mine site name/i), 'Roy Hill')
  await user.selectOptions(screen.getByLabelText(/country/i), 'AU')
  await user.selectOptions(screen.getByLabelText(/machine type/i), 'haul_truck')
  await user.type(screen.getByLabelText(/machine manufacturer/i), 'Caterpillar')
  await user.type(screen.getByLabelText(/machine model/i), '793F')
  await user.type(screen.getByLabelText(/technology supplier/i), 'ASI Mining')
  await user.click(screen.getByLabelText('Highly Autonomous'))
  await user.type(screen.getByLabelText(/quantity/i), '10')
  await user.click(screen.getByLabelText(/authorised to disclose/i))
  return user
}

describe('ContributePage', () => {
  test('renders the contribution form instead of the Sprint 3 placeholder', () => {
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    expect(screen.getByRole('heading', { name: /^contribute$/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit deployment/i })).toBeInTheDocument()
    expect(screen.queryByText(/submission workflow planned/i)).not.toBeInTheDocument()
  })

  test('keeps optional details behind the add-more-detail toggle', async () => {
    const user = userEvent.setup()
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    expect(screen.queryByLabelText(/machine model variant/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /add more detail/i }))
    expect(screen.getByLabelText(/machine model variant/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide additional details/i })).toHaveAttribute('aria-expanded', 'true')
  })

  test('shows required field errors when submitted incomplete', async () => {
    const user = userEvent.setup()
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(screen.getByText('Mine site is required.')).toBeInTheDocument()
    expect(screen.getByText(/two-letter country code/i)).toBeInTheDocument()
    expect(screen.getByText('Machine type is required.')).toBeInTheDocument()
    expect(screen.getByText('Machine manufacturer is required.')).toBeInTheDocument()
    expect(screen.getByText('Machine model is required.')).toBeInTheDocument()
    expect(screen.getByText('Technology supplier is required.')).toBeInTheDocument()
    expect(screen.getByText('Automation level is required.')).toBeInTheDocument()
    expect(screen.getByText('Quantity must be a whole number between 1 and 100000.')).toBeInTheDocument()
    expect(screen.getByText('Confirm that you are authorised to disclose this information.')).toBeInTheDocument()
    expect(screen.getByLabelText(/mine site name/i)).toHaveFocus()
  })

  test('validates optional email and evidence URLs', async () => {
    const user = userEvent.setup()
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    await user.type(screen.getByLabelText(/mine site name/i), 'Roy Hill')
    await user.selectOptions(screen.getByLabelText(/country/i), 'AU')
    await user.selectOptions(screen.getByLabelText(/machine type/i), 'haul_truck')
    await user.type(screen.getByLabelText(/machine manufacturer/i), 'Caterpillar')
    await user.type(screen.getByLabelText(/machine model/i), '793F')
    await user.type(screen.getByLabelText(/technology supplier/i), 'ASI Mining')
    await user.click(screen.getByLabelText('Highly Autonomous'))
    await user.type(screen.getByLabelText(/quantity/i), '10')
    await user.click(screen.getByRole('button', { name: /add more detail/i }))
    await user.type(screen.getByLabelText(/contact email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/evidence url 1/i), 'not-a-url')
    await user.click(screen.getByLabelText(/authorised to disclose/i))
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
    expect(screen.getByText(/valid http or https urls/i)).toBeInTheDocument()
  })

  test('reopens additional details before focusing an invalid hidden email field', async () => {
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    const user = await fillMinimumForm()
    await user.click(screen.getByRole('button', { name: /add more detail/i }))
    await user.type(screen.getByLabelText(/contact email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /hide additional details/i }))
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    const email = await screen.findByLabelText(/contact email/i)
    await waitFor(() => expect(email).toHaveFocus())
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide additional details/i })).toHaveAttribute('aria-expanded', 'true')
  })

  test('keeps the responsive form structure and controlled detail fields discoverable', async () => {
    const user = userEvent.setup()
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    const page = screen.getByRole('heading', { name: /^contribute$/i, level: 1 }).closest('section')
    const form = screen.getByRole('button', { name: /submit deployment/i }).closest('form')
    expect(page).toHaveClass('contribute-page')
    expect(form).toHaveClass('contribution-form')
    expect(screen.getByLabelText(/country/i).tagName).toBe('SELECT')
    const coordinateRow = screen.getByLabelText(/site latitude/i).closest('.form-grid--coordinates')
    expect(coordinateRow).not.toBeNull()
    expect(coordinateRow).toContainElement(screen.getByLabelText(/site longitude/i))
    expect(screen.getByText(/automation technology fitted/i)).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: /add more detail/i })
    await user.click(toggle)
    expect(toggle.nextElementSibling).toHaveAttribute('id', 'additional-contribution-details')
    expect(screen.getByPlaceholderText('e.g. Iron ore')).toBeInTheDocument()
    expect(screen.queryByText('No automation level recorded')).not.toBeInTheDocument()
  })

  test('rejects impossible calendar dates while accepting year-only dates', async () => {
    const user = userEvent.setup()
    render(<ContributePage
      submitContribution={vi.fn().mockResolvedValue(undefined)}
      referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA}
    />)

    await user.type(screen.getByLabelText(/mine site name/i), 'Roy Hill')
    await user.selectOptions(screen.getByLabelText(/country/i), 'AU')
    await user.selectOptions(screen.getByLabelText(/machine type/i), 'haul_truck')
    await user.type(screen.getByLabelText(/machine manufacturer/i), 'Caterpillar')
    await user.type(screen.getByLabelText(/machine model/i), '793F')
    await user.type(screen.getByLabelText(/technology supplier/i), 'ASI Mining')
    await user.click(screen.getByLabelText('Highly Autonomous'))
    await user.type(screen.getByLabelText(/quantity/i), '10')
    await user.type(screen.getByLabelText(/commissioning date or year/i), '2025-02-31')
    await user.click(screen.getByLabelText(/authorised to disclose/i))
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(screen.getByText(/year between 1900 and 2100/i)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/commissioning date or year/i))
    await user.type(screen.getByLabelText(/commissioning date or year/i), '2025')
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))
    expect(await screen.findByText(/pending review/i)).toBeInTheDocument()
  })

  test('submits valid values and shows the success state', async () => {
    const submitContribution = vi.fn().mockResolvedValue(undefined)
    render(<ContributePage
      submitContribution={submitContribution}
      referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA}
    />)

    const user = await fillMinimumForm()
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(await screen.findByRole('heading', { name: /contribution received/i })).toBeInTheDocument()
    // A first submission names no rejected one to replace
    expect(submitContribution).toHaveBeenCalledWith(expect.objectContaining({
      siteName: 'Roy Hill', countryCode: 'AU', machineType: 'haul_truck', quantity: '10',
    }), undefined)
    expect(screen.getByText(/pending review/i)).toBeInTheDocument()
  })

  test('submits through the live API adapter and communicates pending review', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 20202, verification_status: 'pending_review' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    const user = await fillMinimumForm()
    await user.type(screen.getByLabelText(/site latitude/i), '-22.3')
    await user.type(screen.getByLabelText(/site longitude/i), '118.7')
    await user.click(screen.getByRole('button', { name: /add more detail/i }))
    await user.type(screen.getByLabelText(/machine model variant/i), 'XDE')
    await user.click(screen.getByLabelText('Highly Autonomous'))
    await user.selectOptions(screen.getByLabelText(/installation type/i), 'retrofit')
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(await screen.findByText(/pending review/i)).toBeInTheDocument()
    expect(screen.getByText(/submission reference is #20202/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/contributions', expect.objectContaining({ method: 'POST' }))

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(request.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(request.body))).toEqual(expect.objectContaining({
      site_name: 'Roy Hill',
      country_code: 'AU',
      machine_type: 'haul_truck',
      latitude: -22.3,
      longitude: 118.7,
      machine_model_variant: 'XDE',
      quantity: 10,
      automation_level: 'autonomous',
      installation_type: 'retrofit',
      disclosure_accepted: true,
    }))
  })

  test('shows a reference-data failure instead of rendering uncontrolled selects', () => {
    render(<ContributePage referenceData={{ ...DEFAULT_CONTRIBUTION_REFERENCE_DATA, machineTypes: [] }} />)

    expect(screen.getByRole('heading', { name: /reference data unavailable/i })).toBeInTheDocument()
    expect(screen.getByText(/controlled values needed for this form could not be loaded/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit deployment/i })).not.toBeInTheDocument()
  })

  test('loads controlled values from the reference-data API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      machine_types: ['haul_truck'],
      automation_levels: ['autonomous'],
      environments: ['surface'],
      deployment_statuses: ['operational'],
      installation_types: ['unknown'],
      countries: ['AU', 'XR'],
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ContributePage />)

    expect(await screen.findByRole('heading', { name: /^contribute$/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Highly Autonomous' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Australia (AU)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Anonymised (XR)' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/reference-data')
  })

  test('shows a loading state while reference data is being fetched', () => {
    render(<ContributePage referenceDataLoading />)

    expect(screen.getByRole('heading', { name: /loading reference data/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit deployment/i })).not.toBeInTheDocument()
  })

  test('shows an API error without losing the form', async () => {
    const submitContribution = vi.fn().mockRejectedValue(new Error('Server rejected submission'))
    render(<ContributePage
      submitContribution={submitContribution}
      referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA}
    />)

    const user = await fillMinimumForm()
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(await screen.findByRole('heading', { name: /submission failed/i })).toBeInTheDocument()
    expect(screen.getByText('Server rejected submission')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Roy Hill')).toBeInTheDocument()
  })

  test('limits optional text fields to the backend maximum lengths', async () => {
    const user = userEvent.setup()
    render(<ContributePage referenceData={DEFAULT_CONTRIBUTION_REFERENCE_DATA} />)

    await user.click(screen.getByRole('button', { name: /add more detail/i }))

    const cases = [
      { label: /state or region/i, max: 100 },
      { label: /commodity/i, max: 100 },
      { label: /machine model variant/i, max: 100 },
      { label: /technology product/i, max: 200 },
      { label: /organisation/i, max: 200 },
    ]

    for (const { label, max } of cases) {
      const input = screen.getByLabelText(label) as HTMLInputElement

      expect(input).toHaveAttribute('maxLength', String(max))
      expect(input.maxLength).toBe(max)
    }
  })
})
