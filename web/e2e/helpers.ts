import { expect, type Page, type Locator } from '@playwright/test'

/**
 * Shared helpers for Meet e2e tests.
 * All test IDs used here are documented in `USER_STORIES.md`
 * under "Test IDs contract".
 */

export function todayISO(offsetDays = 0): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Create an event directly against the API. Returns the event id. Useful when
 * the UI creation flow is not under test and we want a deterministic starting
 * point for downstream specs.
 */
export async function createEventViaApi(
  page: Page,
  name: string,
  dates: string[],
): Promise<string> {
  const res = await page.request.post('http://localhost:3001/api/events', {
    data: { name, dates },
  })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { id: string }
  return body.id
}

/**
 * Create an event through the UI by filling the form and submitting. Returns
 * the event id extracted from the resulting URL.
 */
export async function createEventViaUI(
  page: Page,
  name: string,
  dates: string[],
): Promise<string> {
  await page.goto('/')
  await page.getByTestId('event-name-input').fill(name)
  for (const d of dates) {
    const cell = page.locator(`[data-testid="date-cell"][data-date="${d}"]`)
    // Date picker may need to advance months to reach future dates.
    // Loop-click next-month until the target cell is visible, up to a reasonable
    // number of clicks.
    let tries = 0
    while (!(await cell.isVisible()) && tries < 24) {
      await page.getByTestId('date-picker-next-month').click()
      tries++
    }
    await cell.click()
    await expect(cell).toHaveAttribute('data-selected', 'true')
  }
  await page.getByTestId('create-event-submit').click()
  await page.waitForURL(/\/[A-Za-z0-9_-]{6,}$/)
  const match = page.url().match(/\/([A-Za-z0-9_-]{6,})$/)
  if (!match) throw new Error('could not derive event id from URL: ' + page.url())
  return match[1]
}

export async function joinAs(page: Page, name: string): Promise<void> {
  const joinForm = page.getByTestId('join-form')
  await expect(joinForm).toBeVisible()
  await page.getByTestId('participant-name-input').fill(name)
  await page.getByTestId('join-submit').click()
  await expect(page.getByTestId('personal-grid')).toBeVisible()
  await expect(page.getByTestId('current-participant')).toContainText(name)
}

export function slotCell(page: Page, isoSlot: string): Locator {
  return page.locator(
    `[data-testid="slot-cell"][data-slot="${isoSlot}"]`,
  )
}

export function groupSlotCell(page: Page, isoSlot: string): Locator {
  return page.locator(
    `[data-testid="group-slot-cell"][data-slot="${isoSlot}"]`,
  )
}

/**
 * Wait for the personal grid's save indicator to show "Saved" after a drag/click.
 */
export async function waitForSave(page: Page): Promise<void> {
  const indicator = page.getByTestId('save-indicator')
  await expect(indicator).toHaveText(/saved/i, { timeout: 5000 })
}

/**
 * Click the first slot, then click the last — a simple way to exercise a
 * multi-cell interaction without relying on drag gesture fidelity. Useful as
 * a coarse assertion companion to explicit drag tests.
 */
export async function toggleSlots(page: Page, isoSlots: string[]): Promise<void> {
  for (const s of isoSlots) {
    await slotCell(page, s).click()
  }
}

/**
 * Simulate click-and-drag across a list of slot cells.
 * Playwright's `dragTo` issues a proper mousedown → mousemove → mouseup sequence.
 */
export async function dragAcross(
  page: Page,
  isoSlots: string[],
): Promise<void> {
  if (isoSlots.length === 0) return
  const first = slotCell(page, isoSlots[0])
  const last = slotCell(page, isoSlots[isoSlots.length - 1])
  const firstBox = await first.boundingBox()
  const lastBox = await last.boundingBox()
  if (!firstBox || !lastBox) throw new Error('slot cells not laid out')

  await page.mouse.move(
    firstBox.x + firstBox.width / 2,
    firstBox.y + firstBox.height / 2,
  )
  await page.mouse.down()
  // Move across each intermediate cell to ensure hover events fire.
  for (const iso of isoSlots.slice(1)) {
    const c = slotCell(page, iso)
    const box = await c.boundingBox()
    if (!box) continue
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 3,
    })
  }
  await page.mouse.move(
    lastBox.x + lastBox.width / 2,
    lastBox.y + lastBox.height / 2,
    { steps: 3 },
  )
  await page.mouse.up()
}

/**
 * Build an ISO UTC slot identifier from a local date string (YYYY-MM-DD) and a
 * local HH:mm. Matches the implementation's `data-slot` format: the point in
 * time is serialized via `Date#toISOString()` after constructing it in the
 * browser's local zone.
 */
export function localSlot(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const [yyyy, mm, dd] = date.split('-').map(Number)
  const d = new Date(yyyy, mm - 1, dd, h, m, 0, 0)
  return d.toISOString()
}
