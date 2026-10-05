import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import App from './App'

function renderApp(initialRoute = '/map') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Application shell and navigation', () => {
  test('renders the primary navigation', () => {
    renderApp()

    const navigation = screen.getByRole('navigation', {
      name: /primary navigation/i,
    })

    expect(navigation).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Map' }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: /equipment/i }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Analytics' }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Contribute' }),
    ).toBeInTheDocument()
  })

  test('keeps all primary navigation links available at 320px', () => {
    window.innerWidth = 320
    window.dispatchEvent(new Event('resize'))

    renderApp()

    const navigation = screen.getByRole('navigation', {
      name: /primary navigation/i,
    })

    expect(navigation).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Map' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /equipment/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contribute' })).toBeInTheDocument()
  })

  test('navigates to the Equipment Register', async () => {
    const user = userEvent.setup()

    renderApp()

    await user.click(
      screen.getByRole('link', { name: /equipment/i }),
    )

    expect(
      screen.getByRole('heading', { name: /equipment/i }),
    ).toBeInTheDocument()
  })

  test('navigates to Analytics', async () => {
    const user = userEvent.setup()

    renderApp()

    await user.click(
      screen.getByRole('link', { name: 'Analytics' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Analytics', level: 1 }),
    ).toBeInTheDocument()
  })

  test('allows keyboard navigation through the main navigation', async () => {
    const user = userEvent.setup()

    renderApp()

    await user.tab()

    expect(
      screen.getByRole('link', { name: /skip to main content/i }),
    ).toHaveFocus()

    await user.tab()

    expect(
      screen.getByRole('link', { name: /mining market map home/i }),
    ).toHaveFocus()

    await user.tab()

    expect(
      screen.getByRole('link', { name: 'Map' }),
    ).toHaveFocus()

    await user.tab()

    expect(
      screen.getByRole('link', { name: /equipment/i }),
    ).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(
      screen.getByRole('heading', { name: /equipment/i }),
    ).toBeInTheDocument()
  })

  test('provides a bypass link to the focusable main content', () => {
    renderApp()

    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1')
  })
})
