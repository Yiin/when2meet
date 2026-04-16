import { test, expect } from '@playwright/test'
import { todayISO, createEventViaApi } from './helpers'

test.describe('Event page layout & share URL', () => {
  test('renders name, dates, and shareable URL', async ({ page }) => {
    const id = await createEventViaApi(page, 'Share me', [todayISO(3)])
    await page.goto(`/${id}`)

    await expect(page.getByTestId('event-name')).toContainText('Share me')
    await expect(page.getByTestId('event-dates')).toBeVisible()

    const share = page.getByTestId('share-url')
    await expect(share).toBeVisible()
    // Either an input's value or element text contains the path.
    const haystack =
      (await share.inputValue().catch(() => null)) ??
      (await share.textContent()) ??
      ''
    expect(haystack).toContain(`/${id}`)
  })

  test('copy button surfaces a copied indicator', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const id = await createEventViaApi(page, 'Copy test', [todayISO(4)])
    await page.goto(`/${id}`)

    await page.getByTestId('copy-share-url').click()
    await expect(page.getByTestId('share-url-copied')).toBeVisible()
  })
})
