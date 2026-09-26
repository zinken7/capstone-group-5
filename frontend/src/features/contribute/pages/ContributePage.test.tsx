import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import ContributePage from './ContributePage'

async function fillMinimumForm() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/mine site name/i), 'Roy Hill')
  await user.type(screen.getByLabelText(/country code/i), 'AU')
  await user.selectOptions(screen.getByLabelText(/machine type/i), 'haul_truck')
  await user.type(screen.getByLabelText(/machine manufacturer/i), 'Caterpillar')
  await user.type(screen.getByLabelText(/quantity/i), '10')
  await user.click(screen.getByLabelText(/authorised to disclose/i))
  return user
}

describe('ContributePage', () => {
  test('renders the contribution form instead of the Sprint 3 placeholder', () => {
    render(<ContributePage />)

    expect(screen.getByRole('heading', { name: /contribute a deployment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit deployment/i })).toBeInTheDocument()
    expect(screen.queryByText(/submission workflow planned/i)).not.toBeInTheDocument()
  })

  test('shows required field errors when submitted incomplete', async () => {
    const user = userEvent.setup()
    render(<ContributePage />)

    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(screen.getByText('Mine site is required.')).toBeInTheDocument()
    expect(screen.getByText(/two-letter country code/i)).toBeInTheDocument()
    expect(screen.getByText('Machine type is required.')).toBeInTheDocument()
    expect(screen.getByText('Machine manufacturer is required.')).toBeInTheDocument()
    expect(screen.getByText('Quantity must be a positive whole number.')).toBeInTheDocument()
    expect(screen.getByText('Confirm that you are authorised to disclose this information.')).toBeInTheDocument()
  })

  test('validates optional email and evidence URLs', async () => {
    const user = userEvent.setup()
    render(<ContributePage />)

    await user.type(screen.getByLabelText(/mine site name/i), 'Roy Hill')
    await user.type(screen.getByLabelText(/country code/i), 'AU')
    await user.selectOptions(screen.getByLabelText(/machine type/i), 'haul_truck')
    await user.type(screen.getByLabelText(/machine manufacturer/i), 'Caterpillar')
    await user.type(screen.getByLabelText(/quantity/i), '10')
    await user.type(screen.getByLabelText(/contact email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/evidence url 1/i), 'not-a-url')
    await user.click(screen.getByLabelText(/authorised to disclose/i))
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
    expect(screen.getByText(/valid http or https urls/i)).toBeInTheDocument()
  })

  test('submits valid values and shows the success state', async () => {
    const submitContribution = vi.fn().mockResolvedValue(undefined)
    render(<ContributePage submitContribution={submitContribution} />)

    const user = await fillMinimumForm()
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(await screen.findByRole('heading', { name: /contribution received/i })).toBeInTheDocument()
    expect(submitContribution).toHaveBeenCalledWith(expect.objectContaining({
      siteName: 'Roy Hill', countryCode: 'AU', machineType: 'haul_truck', quantity: '10',
    }))
  })

  test('shows an API error without losing the form', async () => {
    const submitContribution = vi.fn().mockRejectedValue(new Error('Server rejected submission'))
    render(<ContributePage submitContribution={submitContribution} />)

    const user = await fillMinimumForm()
    await user.click(screen.getByRole('button', { name: /submit deployment/i }))

    expect(await screen.findByRole('heading', { name: /submission failed/i })).toBeInTheDocument()
    expect(screen.getByText('Server rejected submission')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Roy Hill')).toBeInTheDocument()
  })
})
