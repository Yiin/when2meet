import { computed, ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/lib/storage'

export type HourCycleOverride = '12h' | '24h' | null

const locale =
  typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US'

function detectSystemIs12h(): boolean {
  const probe = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const resolved = probe.resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & {
    hourCycle?: string
  }
  // hourCycle 'h11' or 'h12' means 12-hour; 'h23' or 'h24' means 24-hour.
  return (
    resolved.hourCycle === 'h11' ||
    resolved.hourCycle === 'h12' ||
    (resolved.hour12 === true && !resolved.hourCycle)
  )
}

function readStoredOverride(): HourCycleOverride {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.hourCycle)
    if (stored === '12h' || stored === '24h') return stored
  } catch {
    // localStorage might throw in private mode
  }
  return null
}

const systemIs12h = detectSystemIs12h()
const hourCycleOverride = ref<HourCycleOverride>(readStoredOverride())

const is12h = computed<boolean>(() => {
  if (hourCycleOverride.value === '12h') return true
  if (hourCycleOverride.value === '24h') return false
  return systemIs12h
})

const hhmmFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale, {
      hour: is12h.value ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12: is12h.value,
    }),
)

watch(hourCycleOverride, (override) => {
  if (typeof localStorage === 'undefined') return
  try {
    if (override === null) {
      localStorage.removeItem(STORAGE_KEYS.hourCycle)
    } else {
      localStorage.setItem(STORAGE_KEYS.hourCycle, override)
    }
  } catch {
    // localStorage might throw in private mode
  }
})

function normalize(s: string): string {
  // Normalize narrow no-break space to regular space for test matchers.
  return s.replace(/ /g, ' ').replace(/ /g, ' ')
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso + 'T00:00:00')
  return normalize(new Intl.DateTimeFormat(locale, opts).format(d))
}

function formatHHMM(hhmm: string): string {
  const parts = hhmm.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return normalize(hhmmFormatter.value.format(d))
}

function setHourCycle(mode: '12h' | '24h' | 'auto') {
  hourCycleOverride.value = mode === 'auto' ? null : mode
}

export function useLocaleTime() {
  return {
    is12h,
    hourCycleOverride,
    formatHHMM,
    formatDate,
    setHourCycle,
  }
}
