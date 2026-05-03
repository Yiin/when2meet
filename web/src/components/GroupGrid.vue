<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventStore } from '@/stores/event'
import { useLocaleTime } from '@/composables/useLocaleTime'
import { slotKey, timeRows } from '@/lib/slots'

const store = useEventStore()
const { formatHHMM } = useLocaleTime()

interface RowHeader {
  hhmm: string
  label: string
  isHour: boolean
}

const rows = computed<RowHeader[]>(() =>
  timeRows().map((r) => ({
    hhmm: r.hhmm,
    label: formatHHMM(r.hhmm),
    isHour: r.hhmm.endsWith(':00'),
  })),
)

const columns = computed<string[]>(() => store.dates)

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

interface GroupCell {
  slot: string
  count: number
  names: string[]
  style: string
}

function bgStyle(count: number): string {
  if (total.value === 0 || count === 0) return ''
  const ratio = count / total.value
  // Min 12% so the lightest density is still visible, max 90% so it doesn't go opaque.
  const pct = 12 + 78 * ratio
  return `background-color: color-mix(in srgb, var(--paper), var(--accent) ${pct.toFixed(1)}%);`
}

const cellGrid = computed<GroupCell[][]>(() =>
  rows.value.map((row) =>
    columns.value.map((col) => {
      const slot = slotKey(col, row.hhmm)
      const names = index.value.get(slot) ?? []
      const count = names.length
      return { slot, names, count, style: bgStyle(count) }
    }),
  ),
)

const hoverSlot = ref<string | null>(null)
function onEnter(cell: GroupCell) {
  if (cell.count > 0) hoverSlot.value = cell.slot
}
function onLeave(cell: GroupCell) {
  if (hoverSlot.value === cell.slot) hoverSlot.value = null
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
      <div
        class="grid relative"
        :style="{
          gridTemplateColumns: `minmax(70px, auto) repeat(${columns.length}, minmax(60px, 1fr))`,
        }"
      >
        <div class="sticky top-0 left-0 z-20 bg-paper border-b border-r border-rule" />
        <div
          v-for="col in columns"
          :key="'gcol-' + col"
          class="sticky top-0 z-10 bg-paper font-mono text-xs text-ink-soft text-center py-2 border-b border-rule"
        >
          {{
            new Date(col + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          }}
        </div>

        <template v-for="(row, ri) in rows" :key="'grow-' + row.hhmm">
          <div
            class="sticky left-0 z-10 bg-paper font-mono text-[10px] text-ink-faint text-right pr-2 pl-1 border-r border-rule leading-none flex items-center justify-end"
            :class="{ 'opacity-0': !row.isHour, 'border-t border-rule': row.isHour }"
            style="height: 16px"
          >
            <span v-if="row.isHour">{{ row.label }}</span>
          </div>
          <div
            v-for="cell in cellGrid[ri]"
            :key="cell.slot"
            data-testid="group-slot-cell"
            :data-slot="cell.slot"
            :data-count="cell.count"
            :data-total="total"
            class="relative border-b border-r border-rule transition-colors"
            :class="[row.isHour && 'border-t border-rule']"
            :style="cell.style"
            style="height: 16px"
            @mouseenter="onEnter(cell)"
            @mouseleave="onLeave(cell)"
          >
            <div
              v-if="hoverSlot === cell.slot"
              data-testid="group-slot-names"
              class="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-1 min-w-max max-w-xs bg-paper border border-rule px-3 py-2 pointer-events-none"
              role="tooltip"
            >
              <div class="font-serif italic text-sm text-accent">
                {{ cell.count }} available
              </div>
              <div class="font-mono text-xs text-ink-soft mt-1 whitespace-pre-line">
                {{ cell.names.join('\n') }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
