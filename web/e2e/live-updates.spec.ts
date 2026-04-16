import { test, expect, type Browser } from '@playwright/test'
import {
  todayISO,
  joinAs,
  groupSlotCell,
  localSlot,
  slotCell,
  waitForSave,
} from './helpers'

async function createEvent(browser: Browser, name: string, dates: string[]) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const res = await page.request.post('http://localhost:3001/api/events', {
    data: { name, dates },
  })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { id: string }
  await ctx.close()
  return body.id
}

test.describe('Live updates via WebSocket', () => {
  test('context A sees context B saves without reload', async ({ browser }) => {
    const date = todayISO(1)
    const eventId = await createEvent(browser, 'live', [date])

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await pageA.goto(`/${eventId}`)
    await pageB.goto(`/${eventId}`)

    await expect(pageA.getByTestId('participant-count')).toContainText('0')

    await joinAs(pageB, 'Remote Bob')
    const slot = localSlot(date, '09:00')
    await slotCell(pageB, slot).click()
    await waitForSave(pageB)

    await expect(pageA.getByTestId('participant-count')).toContainText('1')
    const cellA = groupSlotCell(pageA, slot)
    await expect(cellA).toHaveAttribute('data-count', '1')

    await ctxA.close()
    await ctxB.close()
  })

  test('new participants show up in live participant count', async ({
    browser,
  }) => {
    const date = todayISO(1)
    const eventId = await createEvent(browser, 'count-live', [date])

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await pageA.goto(`/${eventId}`)
    await pageB.goto(`/${eventId}`)
    await expect(pageA.getByTestId('participant-count')).toContainText('0')

    await joinAs(pageB, 'Joiner 1')
    await expect(pageA.getByTestId('participant-count')).toContainText('1')

    const ctxC = await browser.newContext()
    const pageC = await ctxC.newPage()
    await pageC.goto(`/${eventId}`)
    await joinAs(pageC, 'Joiner 2')
    await expect(pageA.getByTestId('participant-count')).toContainText('2')

    await ctxA.close()
    await ctxB.close()
    await ctxC.close()
  })
})
