# When2Meet — User Stories & Acceptance Spec

This document is the acceptance contract for the implementation agent. Tests in
`/web/e2e/*.spec.ts` exercise every story below. Test IDs listed under
**Test IDs contract** MUST be rendered by the Vue implementation exactly as
written.

---

## Test IDs contract

The Vue app MUST expose the following `data-testid` attributes. Selectors in
spec files depend on these names.

### Home / create-event page (`/`)

- `create-event-form` — root form element
- `event-name-input` — `<input>` for event name
- `date-picker` — container for the calendar grid
- `date-cell` — one per selectable day in the picker (repeated). Each cell
  carries `data-date="YYYY-MM-DD"` and, when selected, `data-selected="true"`.
  Disabled past-dates carry `data-disabled="true"` and must not toggle.
- `date-picker-prev-month` — navigate to previous month
- `date-picker-next-month` — navigate to next month
- `date-picker-month-label` — label such as "April 2026"
- `create-event-submit` — submit button, disabled until name + >=1 date present

### Event page (`/:eventId`)

- `event-name` — heading containing event name
- `event-dates` — element listing the event's dates (human readable)
- `share-url` — element whose `value` or text contains `http.../<eventId>`
- `copy-share-url` — button that copies the share URL to the clipboard
- `share-url-copied` — visible indicator (e.g. toast/tooltip) shown after copy

### Join flow

- `join-form` — only rendered when the user has not yet joined this event
- `participant-name-input` — name input inside join form
- `join-submit` — join button
- `current-participant` — element displayed after join, containing the joined
  name as text

### Personal availability grid

- `personal-grid` — grid container; rendered once joined
- `slot-cell` — one per 15-min cell. Each has `data-slot="<ISO UTC>"` (e.g.
  `2026-04-20T09:15:00.000Z`) and `data-filled="true|false"`.
- `slot-column-header` — one per date column (carries `data-date="YYYY-MM-DD"`)
- `slot-row-header` — one per time row (carries `data-time="HH:mm"`). The
  rendered label is 12h or 24h per browser locale.
- `save-indicator` — shows "Saved" / "Saving…" status so tests can wait for
  auto-save completion.

### Group availability grid

- `group-grid` — heatmap container
- `group-slot-cell` — one per cell, matches `data-slot=` with personal grid.
  Carries `data-count="<n>"` and `data-total="<n>"`. Background color is
  computed from the ratio but tests rely on the data attributes, not color.
- `group-slot-names` — tooltip/popover that appears on hover/focus of a
  `group-slot-cell`; contains the names of participants available at that slot.
- `participant-count` — element showing the total participant count.

### Theme toggle

- `theme-toggle` — button. The `<html>` root element reflects the current
  theme via either `data-theme="light|dark"` or the `dark` class.

### Misc

- `nav-home` — link/button returning to the home page.

Persistence key conventions:

- `w2m-theme` — `"light"` or `"dark"` in `localStorage`
- `w2m-name:<eventId>` — the participant name remembered for a given event

---

## Stories

### 1. Create event

**As a** meeting organizer, **I want** to pick dates and name an event, **so
that** I can share a single link with invitees.

Acceptance criteria

- Home page renders `create-event-form`, `event-name-input`, `date-picker`,
  `create-event-submit`.
- `create-event-submit` is disabled until the name is non-empty AND at least
  one date is selected.
- Clicking a `date-cell` toggles its selected state (reflected in
  `data-selected`).
- Dates before today carry `data-disabled="true"` and clicking them is a no-op
  (no selection change).
- Submitting POSTs `{ name, dates: ["YYYY-MM-DD", ...] }` to `/api/events` and
  navigates the browser to `/<returned id>`.
- Event page renders the submitted name in `event-name` and the chosen dates
  in `event-dates`.

### 2. Event page layout & share URL

**As an** organizer, **I want** an obvious shareable link, **so that** I can
paste it into a chat.

Acceptance criteria

- `share-url` displays the full URL ending in `/<eventId>`.
- `copy-share-url` writes that URL to the clipboard and briefly surfaces
  `share-url-copied`.

### 3. Join flow

**As a** participant, **I want** to enter my name once, **so that** my slots
are attributed to me and I'm auto-joined on return.

Acceptance criteria

- On a fresh event visit with no stored name, `join-form` is visible and
  `personal-grid` is not.
- Submitting the form persists `w2m-name:<eventId>` in `localStorage` and
  reveals `personal-grid` plus `current-participant` with the entered name.
- On subsequent visits (same browser), `join-form` is NOT rendered — the user
  is auto-joined using the stored name.
- Entering a name that already exists for this event loads that participant's
  existing slots rather than clobbering them.

### 4. Personal availability grid

**As a** participant, **I want** to paint my availability on a grid, **so
that** the organizer sees when I'm free.

Acceptance criteria

- Grid has one column per event date and 96 rows (24 h × 4 quarter-hours).
- Each `slot-cell` carries an ISO-UTC `data-slot`.
- Clicking a cell toggles its `data-filled` attribute.
- Click-and-drag across multiple cells toggles them in bulk. Drag mode is
  decided by the first cell:
  - Drag started on empty → fills every cell entered.
  - Drag started on filled → clears every cell entered.
- After the drag ends, the client POSTs `/api/events/:id/availability` with
  the full slot array (debounced ~300 ms). `save-indicator` transitions to
  "Saved" once the request resolves.
- Row labels use 12-hour format if the browser locale is `en-US`, else 24-hour
  (tests assert via locale override).

### 5. Group availability grid (heatmap)

**As an** organizer, **I want** an at-a-glance view of group availability,
**so that** I can find the best slot.

Acceptance criteria

- For every slot there is a corresponding `group-slot-cell` with
  `data-count` (number available) and `data-total` (total participants).
- With 0 participants, every cell reports `data-count="0"` and
  `data-total="0"`.
- Hovering a `group-slot-cell` reveals `group-slot-names` containing the
  comma- or newline-separated list of available participants.
- `participant-count` reflects the number of joined participants.

### 6. Live updates (WebSocket)

**As an** organizer, **I want** the page to refresh as participants respond,
**so that** I don't have to reload.

Acceptance criteria

- With two browser contexts open on the same event, when Context B saves
  availability, Context A's `group-slot-cell` `data-count` updates without a
  reload.
- New participants appearing from Context B are reflected in
  `participant-count` in Context A.

### 7. Theme toggle

**As a** user, **I want** a light/dark toggle, **so that** I can match my
preference.

Acceptance criteria

- First load with no stored theme honors `prefers-color-scheme`.
- Clicking `theme-toggle` flips between light and dark and persists the choice
  to `w2m-theme` in `localStorage`.
- The `<html>` element carries a `data-theme` attribute (or `dark` class) that
  matches the current theme.

### 8. Time-format locale

**As a** user, **I want** the grid to use my locale's time format, **so
that** the grid feels native.

Acceptance criteria

- With `en-US` locale the row labels render as `9:00 AM`, `9:15 AM`, etc.
- With `en-GB` or any non-US locale the labels render as `09:00`, `09:15`,
  etc.

### 9. Persistence & edge cases

**As a** returning participant, **I want** my work preserved across reloads,
**so that** I don't start over.

Acceptance criteria

- Reloading the event page preserves the participant's filled cells (server
  is source of truth).
- Navigating away and returning skips the join form when
  `w2m-name:<eventId>` is set.
- Creating an event with only today's date works (today is not "past").
