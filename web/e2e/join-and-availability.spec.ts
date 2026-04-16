import { test, expect } from '@playwright/test'
import {
  todayISO,
  createEventViaApi,
  joinAs,
  slotCell,
  localSlot,
  dragAcross,
  waitForSave,
} from './helpers'

test.describe('Join flow', () => {
  test('join form shows when no stored name, hides after joining', async ({
    page,
  }) => {
    const id = await createEventViaApi(page, 'Join flow', [todayISO(1)])
    await page.goto(`/${id}`)

    await expect(page.getByTestId('join-form')).toBeVisible()
    await expect(page.getByTestId('personal-grid')).toHaveCount(0)

    await joinAs(page, 'Alice')
    await expect(page.getByTestId('join-form')).toHaveCount(0)
  })

  test('stores name in localStorage under w2m-name:<eventId>', async ({
    page,
  }) => {
    const id = await createEventViaApi(page, 'Storage', [todayISO(2)])
    await page.goto(`/${id}`)
    await joinAs(page, 'Bob')

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      `w2m-name:${id}`,
    )
    expect(stored).toBe('Bob')
  })

  test('re-entering an existing name loads that participant’s slots', async ({
    page,
    context,
  }) => {
    const id = await createEventViaApi(page, 'Rejoin', [todayISO(3)])
    const date = todayISO(3)
    const slots = [localSlot(date, '10:00'), localSlot(date, '10:15')]

    // Seed availability directly so we don't depend on UI save timing.
    const res = await page.request.post(
      `http://localhost:3001/api/events/${id}/availability`,
      { data: { name: 'Carol', slots } },
    )
    expect(res.ok()).toBeTruthy()

    // Fresh browser context so there is no localStorage for this event.
    const page2 = await context.newPage()
    await page2.goto(`/${id}`)
    await joinAs(page2, 'Carol')

    for (const s of slots) {
      await expect(slotCell(page2, s)).toHaveAttribute('data-filled', 'true')
    }
  })
})

test.describe('Personal availability grid', () => {
  test('clicking a slot toggles data-filled and auto-saves', async ({
    page,
  }) => {
    const date = todayISO(1)
    const id = await createEventViaApi(page, 'Toggle', [date])
    await page.goto(`/${id}`)
    await joinAs(page, 'Dan')

    const slot = localSlot(date, '09:00')
    const cell = slotCell(page, slot)
    await expect(cell).toHaveAttribute('data-filled', 'false')
    await cell.click()
    await expect(cell).toHaveAttribute('data-filled', 'true')

    await waitForSave(page)

    // Server should reflect it.
    const server = await page.request.get(
      `http://localhost:3001/api/events/${id}`,
    )
    const body = (await server.json()) as {
      participants: { name: string; slots: string[] }[]
    }
    const dan = body.participants.find((p) => p.name === 'Dan')
    expect(dan?.slots).toContain(slot)
  })

  test('drag from empty fills every entered cell', async ({ page }) => {
    const date = todayISO(1)
    const id = await createEventViaApi(page, 'Drag fill', [date])
    await page.goto(`/${id}`)
    await joinAs(page, 'Ella')

    const slots = [
      localSlot(date, '09:00'),
      localSlot(date, '09:15'),
      localSlot(date, '09:30'),
      localSlot(date, '09:45'),
    ]
    await dragAcross(page, slots)

    for (const s of slots) {
      await expect(slotCell(page, s)).toHaveAttribute('data-filled', 'true')
    }
    await waitForSave(page)
  })

  test('drag from filled clears every entered cell', async ({ page }) => {
    const date = todayISO(1)
    const slots = [
      localSlot(date, '14:00'),
      localSlot(date, '14:15'),
      localSlot(date, '14:30'),
    ]
    const id = await createEventViaApi(page, 'Drag clear', [date])

    // Seed filled slots for Frank directly via API.
    await page.request.post(
      `http://localhost:3001/api/events/${id}/availability`,
      { data: { name: 'Frank', slots } },
    )

    await page.goto(`/${id}`)
    await joinAs(page, 'Frank')

    for (const s of slots) {
      await expect(slotCell(page, s)).toHaveAttribute('data-filled', 'true')
    }

    await dragAcross(page, slots)

    for (const s of slots) {
      await expect(slotCell(page, s)).toHaveAttribute('data-filled', 'false')
    }
    await waitForSave(page)
  })
})

test.describe('Time-format locale', () => {
  test.use({ locale: 'en-US' })
  test('en-US locale renders 12-hour labels', async ({ page }) => {
    const id = await createEventViaApi(page, 'Locale US', [todayISO(1)])
    await page.goto(`/${id}`)
    await joinAs(page, 'Gina')

    const row = page.locator(
      '[data-testid="slot-row-header"][data-time="09:00"]',
    )
    await expect(row).toContainText(/9:00\s*AM/i)
  })
})

test.describe('Time-format locale (24h)', () => {
  test.use({ locale: 'en-GB' })
  test('en-GB locale renders 24-hour labels', async ({ page }) => {
    const id = await createEventViaApi(page, 'Locale GB', [todayISO(1)])
    await page.goto(`/${id}`)
    await joinAs(page, 'Hank')

    const row = page.locator(
      '[data-testid="slot-row-header"][data-time="09:00"]',
    )
    await expect(row).toContainText('09:00')
    await expect(row).not.toContainText(/AM|PM/i)
  })
})
