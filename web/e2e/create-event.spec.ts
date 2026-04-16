import { test, expect } from '@playwright/test'
import { todayISO, createEventViaUI } from './helpers'

test.describe('Create event', () => {
  test('submit is disabled until name and at least one date are selected', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('create-event-form')).toBeVisible()
    const submit = page.getByTestId('create-event-submit')
    await expect(submit).toBeDisabled()

    // name alone — still disabled.
    await page.getByTestId('event-name-input').fill('Team sync')
    await expect(submit).toBeDisabled()

    // pick a date (today, always valid).
    const today = todayISO()
    const cell = page.locator(`[data-testid="date-cell"][data-date="${today}"]`)
    await cell.click()
    await expect(submit).toBeEnabled()

    // deselect → disabled again.
    await cell.click()
    await expect(submit).toBeDisabled()
  })

  test('past dates are marked disabled and cannot be selected', async ({
    page,
  }) => {
    await page.goto('/')
    const yesterday = todayISO(-1)
    const cell = page.locator(
      `[data-testid="date-cell"][data-date="${yesterday}"]`,
    )
    // It's possible yesterday is on the previous month — navigate back if so.
    if (!(await cell.isVisible())) {
      await page.getByTestId('date-picker-prev-month').click()
    }
    await expect(cell).toHaveAttribute('data-disabled', 'true')
    await cell.click({ force: true }).catch(() => undefined)
    await expect(cell).not.toHaveAttribute('data-selected', 'true')
  })

  test('creates event and navigates to /<eventId>', async ({ page }) => {
    const id = await createEventViaUI(page, 'Launch review', [
      todayISO(1),
      todayISO(2),
    ])
    expect(id).toMatch(/^[A-Za-z0-9_-]{6,}$/)
    await expect(page.getByTestId('event-name')).toContainText('Launch review')
    await expect(page.getByTestId('event-dates')).toBeVisible()
  })

  test('event with only today works (today is not past)', async ({ page }) => {
    const id = await createEventViaUI(page, 'Today only', [todayISO()])
    expect(id).toBeTruthy()
    await expect(page.getByTestId('event-name')).toContainText('Today only')
  })
})
