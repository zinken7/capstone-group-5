import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const publicPages = [
  { name: 'Map', path: '/map' },
  { name: 'Equipment', path: '/equipment' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Contribute', path: '/contribute' },
  { name: 'Admin Login', path: '/admin/login' },
]

for (const publicPage of publicPages) {
  test(`${publicPage.name} has no serious or critical accessibility violations`, async ({
    page,
  }) => {
    await page.goto(publicPage.path)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const seriousOrCritical = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    )

    expect(seriousOrCritical).toEqual([])
  })
}

test('Admin Review Queue has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.route('**/api/admin/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'reviewer@example.com',
        role: 'admin',
        must_change_password: false,
      }),
    })
  })

  await page.route('**/api/admin/reviews', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })

  await page.goto('/admin')
  await page.waitForLoadState('networkidle')

  await expect(
    page.getByRole('heading', { name: 'Review queue' }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const seriousOrCritical = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(seriousOrCritical).toEqual([])
})

test('Admin Users has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.route('**/api/admin/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'root@example.com',
        role: 'root',
        must_change_password: false,
      }),
    })
  })

  await page.route('**/api/admin/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 1,
            email: 'root@example.com',
            role: 'root',
            active: true,
            must_change_password: false,
            created_at: '2026-10-05T00:00:00Z',
          },
          {
            id: 2,
            email: 'reviewer@example.com',
            role: 'admin',
            active: true,
            must_change_password: true,
            created_at: '2026-10-05T01:00:00Z',
          },
        ],
      }),
    })
  })

  await page.goto('/admin/users')
  await page.waitForLoadState('networkidle')

  await expect(
    page.getByRole('table', { name: 'Administrator accounts' }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const seriousOrCritical = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(seriousOrCritical).toEqual([])
})

test('Admin Deployment Review has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.route('**/api/admin/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'reviewer@example.com',
        role: 'admin',
        must_change_password: false,
      }),
    })
  })

  await page.route('**/api/admin/deployments/12', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 12,
        verification_status: 'pending_review',
        site_id: 3,
        site_name: 'Kalgoorlie Super Pit',
        country_code: 'AU',
        region: 'Goldfields',
        commodity: 'gold',
        machine_manufacturer: 'Sandvik',
        machine_model: 'LH517i',
        model_variant: null,
        machine_type: 'lhd',
        quantity: 8,
        technology_supplier: 'Sandvik',
        technology_product: 'AutoMine',
        automation_level: 'semi_autonomous',
        environment: 'underground',
        installation_type: 'unknown',
        status: 'announced',
        commissioning_date: null,
        commissioning_year: 2024,
        valid_from: '2024-01-01',
        valid_to: null,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-02T00:00:00Z',
        evidence: [
          {
            url: 'https://example.com/evidence/12',
            source_type: 'news',
            publisher: null,
            published_date: null,
          },
        ],
        reviews: [],
        revisions: [],
        corrections: [],
      }),
    })
  })

  await page.route('**/api/reference-data', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'offline' }),
    })
  })

  await page.goto('/admin/deployments/12')
  await page.waitForLoadState('networkidle')

  await expect(
    page.getByRole('heading', { name: 'Kalgoorlie Super Pit' }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const seriousOrCritical = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(seriousOrCritical).toEqual([])
})

test('Admin Password Change has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.route('**/api/admin/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'reviewer@example.com',
        role: 'admin',
        must_change_password: true,
      }),
    })
  })

  await page.goto('/admin/password')
  await page.waitForLoadState('networkidle')

  await expect(
    page.getByRole('heading', { name: /change.*password/i }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const seriousOrCritical = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(seriousOrCritical).toEqual([])
})