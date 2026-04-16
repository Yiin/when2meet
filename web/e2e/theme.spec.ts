import { test, expect } from '@playwright/test'

async function getTheme(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const el = document.documentElement
    const attr = el.getAttribute('data-theme')
    if (attr) return attr
    return el.classList.contains('dark') ? 'dark' : 'light'
  })
}

test.describe('Theme toggle', () => {
  test('toggle flips theme and persists to localStorage', async ({ page }) => {
    await page.goto('/')
    const initial = await getTheme(page)
    expect(['light', 'dark']).toContain(initial)

    await page.getByTestId('theme-toggle').click()
    const flipped = await getTheme(page)
    expect(flipped).not.toBe(initial)

    const stored = await page.evaluate(() => localStorage.getItem('w2m-theme'))
    expect(stored).toBe(flipped)

    await page.reload()
    await expect.poll(() => getTheme(page)).toBe(flipped)
  })

  test.describe('prefers-color-scheme: dark', () => {
    test.use({ colorScheme: 'dark' })
    test('first load honors prefers-color-scheme when no stored choice', async ({
      page,
    }) => {
      // Clear any leftover preference for this origin.
      await page.goto('/')
      await page.evaluate(() => localStorage.removeItem('w2m-theme'))
      await page.reload()
      await expect.poll(() => getTheme(page)).toBe('dark')
    })
  })

  test.describe('prefers-color-scheme: light', () => {
    test.use({ colorScheme: 'light' })
    test('first load honors prefers-color-scheme: light', async ({ page }) => {
      await page.goto('/')
      await page.evaluate(() => localStorage.removeItem('w2m-theme'))
      await page.reload()
      await expect.poll(() => getTheme(page)).toBe('light')
    })
  })
})
