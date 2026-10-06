import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import App from '../../App'
import { stubApi } from '../../test/stub-api'

const profile = (role: 'root' | 'admin') => () => Response.json({ email: `${role}@example.com`, role, must_change_password: false })
const accounts = (reviewerActive = true) => () => Response.json({
  items: [
    { id: 1, email: 'root@example.com', role: 'root', active: true, must_change_password: false, created_at: '2026-10-05T00:00:00Z' },
    { id: 2, email: 'reviewer@example.com', role: 'admin', active: reviewerActive, must_change_password: true, created_at: '2026-10-05T01:00:00Z' },
  ],
})

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('administrators page', () => {
  test('is closed to administrators who are not root, and not linked for them', async () => {
    stubApi({ 'GET /api/admin/session': profile('admin') })
    renderAt('/admin/users')

    expect(await screen.findByText('Root administrators only')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Administrators' })).not.toBeInTheDocument()
  })

  test('lists accounts for root, with root accounts left to the command line', async () => {
    stubApi({ 'GET /api/admin/session': profile('root'), 'GET /api/admin/users': accounts() })
    renderAt('/admin/users')

    expect(await screen.findByRole('link', { name: 'Administrators' })).toBeInTheDocument()
    // The header also shows the signed-in email, so look inside the accounts table
    const table = await screen.findByRole('table', { name: 'Administrator accounts' })
    const rootRow = within(table).getByText('root@example.com').closest('tr')
    const reviewerRow = within(table).getByText('reviewer@example.com').closest('tr')
    if (!rootRow || !reviewerRow) throw new Error('missing rows')
    expect(within(rootRow).getByText('Managed from the command line')).toBeInTheDocument()
    expect(within(rootRow).queryByRole('button')).not.toBeInTheDocument()
    expect(within(reviewerRow).getByText('Temporary password not changed yet')).toBeInTheDocument()
  })

  test('adds an administrator and shows the temporary password once', async () => {
    const calls = stubApi({
      'GET /api/admin/session': profile('root'),
      'GET /api/admin/users': accounts(),
      'POST /api/admin/users': () => Response.json(
        { id: 3, email: 'new@example.com', role: 'admin', temporary_password: 'Tmp-Password-123' }, { status: 201 }),
    })
    const user = userEvent.setup()
    renderAt('/admin/users')

    await user.type(await screen.findByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Add administrator' }))
    expect(screen.getByRole('alert')).toHaveTextContent('valid email address')

    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Add administrator' }))

    expect(await screen.findByText('Tmp-Password-123')).toBeInTheDocument()
    expect(screen.getByText(/only time it is shown/)).toBeInTheDocument()
    const post = calls.find((call) => call.key === 'POST /api/admin/users')
    expect(post?.body).toEqual({ email: 'new@example.com' })
    expect(post?.headers.get('X-Requested-With')).toBe('fetch')

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByText('Tmp-Password-123')).not.toBeInTheDocument()
  })

  test('deactivates after confirmation and reactivates', async () => {
    const calls = stubApi({
      'GET /api/admin/session': profile('root'),
      'GET /api/admin/users': [accounts(true), accounts(false)],
      'PATCH /api/admin/users/2': () => Response.json({ id: 2, active: false }),
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    renderAt('/admin/users')

    await user.click(await screen.findByRole('button', { name: 'Deactivate reviewer@example.com' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Reactivate reviewer@example.com' })).toBeInTheDocument()
    expect(calls.find((call) => call.key === 'PATCH /api/admin/users/2')?.body).toEqual({ active: false })
  })

  test('does nothing when deactivation is not confirmed', async () => {
    const calls = stubApi({ 'GET /api/admin/session': profile('root'), 'GET /api/admin/users': accounts() })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    renderAt('/admin/users')

    await user.click(await screen.findByRole('button', { name: 'Deactivate reviewer@example.com' }))
    expect(calls.some((call) => call.key.startsWith('PATCH'))).toBe(false)
  })
})
