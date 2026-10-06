import { expect, test } from '@playwright/test'

for (const width of [320, 390]) {
  test(`primary navigation reflows without horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')

    const navigation = page.getByRole('navigation', {
      name: /primary navigation/i,
    })

    await expect(navigation).toBeVisible()

    const links = navigation.getByRole('link')
    await expect(links).toHaveCount(4)

    const pageDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(pageDimensions.scrollWidth).toBeLessThanOrEqual(
      pageDimensions.clientWidth,
    )

    const linkBoxes = await links.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()

        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          height: rect.height,
        }
      }),
    )

    for (const box of linkBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(width)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }

    const rows = new Set(linkBoxes.map((box) => Math.round(box.top)))
    expect(rows.size).toBeGreaterThan(1)
  })
}