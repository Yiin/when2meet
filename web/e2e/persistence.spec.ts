import { test, expect } from '@playwright/test'
import {
  todayISO,
  createEventViaApi,
  joinAs,
  slotCell,
  localSlot,
  waitForSave,
} from './helpers'

test.describe('Persistence & remembered name', () => {
  test('reloading preserves participant slots from the server', async ({
    page,
  }) => {
    const date = todayISO(1)
    const id = await createEventViaApi(page, 'Reload', [date])
    await page.goto(`/${id}`)
    await joinAs(page, 'Persist')

    const slots = [localSlot(date, '10:00'), localSlot(date, '10:15')]
    for (const s of slots) {
      await slotCell(page, s).click()
    }
    await waitForSave(page)

    await page.reload()
    // After reload, user is auto-joined (name stored) and grid reflects saved state.
    await expect(page.getByTestId('join-form')).toHaveCount(0)
    await expect(page.getByTestId('current-participant')).toContainText(
      'Persist',
    )

    for (const s of slots) {
      await expect(slotCell(page, s)).toHaveAttribute('data-filled', 'true')
    }
  })

  test('navigating away and returning skips the join form', async ({
    page,
  }) => {
    const id = await createEventViaApi(page, 'Away', [todayISO(2)])
    await page.goto(`/${id}`)
    await joinAs(page, 'Returner')

    // Navigate away (home) and come back.
    await page.goto('/')
    await page.goto(`/${id}`)

    await expect(page.getByTestId('join-form')).toHaveCount(0)
    await expect(page.getByTestId('current-participant')).toContainText(
      'Returner',
    )
    await expect(page.getByTestId('personal-grid')).toBeVisible()
  })

  test('localStorage key is scoped per event id', async ({ page }) => {
    const idA = await createEventViaApi(page, 'Scope A', [todayISO(1)])
    const idB = await createEventViaApi(page, 'Scope B', [todayISO(1)])

    await page.goto(`/${idA}`)
    await joinAs(page, 'Scoped')

    // Different event — should prompt to join again.
    await page.goto(`/${idB}`)
    await expect(page.getByTestId('join-form')).toBeVisible()
  })
})
