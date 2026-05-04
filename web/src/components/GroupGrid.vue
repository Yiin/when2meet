<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventStore } from '@/stores/event'
import { useLocaleTime } from '@/composables/useLocaleTime'
import ScheduleGrid from './ScheduleGrid.vue'

const ROW_HEIGHT = 16

const store = useEventStore()
const { formatHHMM, formatDate } = useLocaleTime()

const total = computed(() => store.participants.length)

const index = computed(() => {
  const map = new Map<string, string[]>()
  for (const p of store.participants) {
    for (const s of p.slots) {
      const arr = map.get(s)
      if (arr) arr.push(p.name)
      else map.set(s, [p.name])
    }
  }
  return map
})

function bgStyle(count: number): string {
  if (total.value === 0 || count === 0) return ''
  const ratio = count / total.value
  // Min 12% so the lightest density is still visible, max 90% so it doesn't go opaque.
  const pct = 12 + 78 * ratio
  return `background-color: color-mix(in srgb, var(--paper), var(--accent) ${pct.toFixed(1)}%);`
}

function namesFor(slot: string): string[] {
  return index.value.get(slot) ?? []
}

const hoverSlot = ref<string | null>(null)
function onEnter(slot: string) {
  hoverSlot.value = slot
}
function onLeave(slot: string) {
  if (hoverSlot.value === slot) hoverSlot.value = null
}

function nextHhmm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const totalMin = (h ?? 0) * 60 + (m ?? 0) + 15
  const wrapped = totalMin % (24 * 60)
  const nh = Math.floor(wrapped / 60)
  const nm = wrapped % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function formatRange(hhmm: string): string {
  return `${formatHHMM(hhmm)}–${formatHHMM(nextHhmm(hhmm))}`
}

function formatDay(date: string): string {
  return formatDate(date, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-baseline justify-between">
      <h3 class="font-serif italic text-base text-ink">
        Everyone
      </h3>
      <span class="font-mono text-xs text-ink-faint">
        <span data-testid="participant-count">{{ total }}</span>
        {{ total === 1 ? ' person' : ' people' }}
      </span>
    </div>

    <div data-testid="group-grid">
      <ScheduleGrid :row-height="ROW_HEIGHT">
        <template #cell="{ slotKey: slot, hhmm, date, isHour, rowHeight }">
          <div
            data-testid="group-slot-cell"
            :data-slot="slot"
            :data-count="namesFor(slot).length"
            :data-total="total"
            class="relative border-b border-r border-rule transition-colors"
            :class="[isHour && 'border-t border-rule']"
            :style="[bgStyle(namesFor(slot).length), { height: rowHeight + 'px' }]"
            @mouseenter="onEnter(slot)"
            @mouseleave="onLeave(slot)"
          >
            <div
              v-if="hoverSlot === slot"
              data-testid="group-slot-names"
              class="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-1 min-w-max max-w-xs bg-paper border border-rule px-3 py-2 pointer-events-none"
              role="tooltip"
            >
              <div class="font-serif italic text-xs text-accent">
                {{ formatDay(date) }} — {{ formatRange(hhmm) }}
              </div>
              <div class="font-serif italic text-sm text-accent mt-1">
                {{ namesFor(slot).length }} available
              </div>
              <div
                v-if="namesFor(slot).length > 0"
                class="font-mono text-xs text-ink-soft mt-1 whitespace-pre-line"
              >
                {{ namesFor(slot).join('\n') }}
              </div>
            </div>
          </div>
        </template>
      </ScheduleGrid>
    </div>
  </div>
</template>
