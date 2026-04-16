import { test, expect } from '@playwright/test'
import {
  todayISO,
  createEventViaApi,
  joinAs,
  groupSlotCell,
  localSlot,
} from './helpers'

test.describe('Group availability grid', () => {
  test('empty event reports count 0 / total 0', async ({ page }) => {
    const date = todayISO(1)
    const id = await createEventViaApi(page, 'Empty', [date])
    await page.goto(`/${id}`)

    // Event page should render the group grid before join (read-only for viewers).
    const cell = groupSlotCell(page, localSlot(date, '09:00'))
    await expect(cell).toHaveAttribute('data-count', '0')
    await expect(cell).toHaveAttribute('data-total', '0')
    await expect(page.getByTestId('participant-count')).toContainText('0')
  })

  test('two-participant overlap shows correct counts and names on hover', async ({
    page,
  }) => {
    const date = todayISO(1)
    const id = await createEventViaApi(page, 'Overlap', [date])

    const aSlots = [
      localSlot(date, '09:00'),
      localSlot(date, '09:15'),
      localSlot(date, '09:30'),
    ]
    const bSlots = [
      localSlot(date, '09:15'),
      localSlot(date, '09:30'),
      localSlot(date, '09:45'),
    ]

    await page.request.post(
      `http://localhost:3001/api/events/${id}/availability`,
      { data: { name: 'Alice', slots: aSlots } },
    )
    await page.request.post(
      `http://localhost:3001/api/events/${id}/availability`,
      { data: { name: 'Bob', slots: bSlots } },
    )

    await page.goto(`/${id}`)
    await expect(page.getByTestId('participant-count')).toContainText('2')

    // Unique-to-Alice: count=1
    const unique = groupSlotCell(page, localSlot(date, '09:00'))
    await expect(unique).toHaveAttribute('data-count', '1')
    await expect(unique).toHaveAttribute('data-total', '2')

    // Overlap: count=2
    const overlap = groupSlotCell(page, localSlot(date, '09:15'))
    await expect(overlap).toHaveAttribute('data-count', '2')
    await expect(overlap).toHaveAttribute('data-total', '2')

    // Hover reveals names.
    await overlap.hover()
    const names = page.getByTestId('group-slot-names')
    await expect(names).toBeVisible()
    await expect(names).toContainText('Alice')
    await expect(names).toContainText('Bob')

    // Empty slot: count=0.
    const emptySlot = groupSlotCell(page, localSlot(date, '11:00'))
    await expect(emptySlot).toHaveAttribute('data-count', '0')
  })

  test('joining increments participant count', async ({ page }) => {
    const id = await createEventViaApi(page, 'Count', [todayISO(1)])
    await page.goto(`/${id}`)
    await expect(page.getByTestId('participant-count')).toContainText('0')
    await joinAs(page, 'Ivy')
    await expect(page.getByTestId('participant-count')).toContainText('1')
  })
})
