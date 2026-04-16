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
  const alpha = 0.15 + 0.85 * ratio
  return `background-color: rgba(34, 197, 94, ${alpha.toFixed(3)});`
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
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Everyone
      </h3>
      <span
        class="text-xs text-slate-500 dark:text-slate-400"
      >
        <span data-testid="participant-count">{{ total }}</span>
        {{ total === 1 ? 'person' : 'people' }}
      </span>
    </div>

    <div
      data-testid="group-grid"
      class="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      <div
        class="grid relative"
        :style="{
          gridTemplateColumns: `minmax(70px, auto) repeat(${columns.length}, minmax(60px, 1fr))`,
        }"
      >
        <div class="sticky top-0 left-0 z-20 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200 dark:border-slate-800" />
        <div
          v-for="col in columns"
          :key="'gcol-' + col"
          class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-600 dark:text-slate-300 text-center py-2 border-b border-slate-200 dark:border-slate-800"
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
            class="sticky left-0 z-10 bg-slate-50 dark:bg-slate-950 text-[11px] text-right pr-2 pl-1 text-slate-500 dark:text-slate-400 border-r border-b border-slate-100 dark:border-slate-800 leading-none flex items-center justify-end"
            :class="{ 'opacity-0': !row.isHour }"
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
            class="relative border-b border-slate-100 dark:border-slate-800 transition-colors"
            :class="[
              row.isHour && 'border-t border-slate-200 dark:border-slate-800',
            ]"
            :style="cell.style"
            style="height: 16px"
            @mouseenter="onEnter(cell)"
            @mouseleave="onLeave(cell)"
          >
            <div
              v-if="hoverSlot === cell.slot"
              data-testid="group-slot-names"
              class="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-1 min-w-max max-w-xs rounded-lg bg-slate-900 text-white text-xs px-2 py-1 shadow-lg pointer-events-none whitespace-pre"
              role="tooltip"
            >
              {{ cell.names.join(', ') }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
