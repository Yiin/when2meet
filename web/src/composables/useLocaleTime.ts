const locale =
  typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US'

const probe = new Intl.DateTimeFormat(locale, {
  hour: 'numeric',
  minute: '2-digit',
})
const resolved = probe.resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & {
  hourCycle?: string
}
// hourCycle 'h11' or 'h12' means 12-hour; 'h23' or 'h24' means 24-hour.
const is12h =
  resolved.hourCycle === 'h11' ||
  resolved.hourCycle === 'h12' ||
  (resolved.hour12 === true && !resolved.hourCycle)

const hhmmFormatter = new Intl.DateTimeFormat(locale, {
  hour: is12h ? 'numeric' : '2-digit',
  minute: '2-digit',
  hour12: is12h,
})

function normalize(s: string): string {
  // Normalize narrow no-break space to regular space for test matchers.
  return s.replace(/\u202f/g, ' ').replace(/\u00a0/g, ' ')
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso + 'T00:00:00')
  return normalize(new Intl.DateTimeFormat(locale, opts).format(d))
}

export function useLocaleTime() {
  function formatHHMM(hhmm: string): string {
    const parts = hhmm.split(':').map(Number)
    const h = parts[0] ?? 0
    const m = parts[1] ?? 0
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return normalize(hhmmFormatter.format(d))
  }

  return { is12h, formatHHMM, formatDate }
}
