<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useEventStore } from '@/stores/event'
import { useDragSelect } from '@/composables/useDragSelect'
import { useLocaleTime } from '@/composables/useLocaleTime'
import { slotKey, timeRows } from '@/lib/slots'

const store = useEventStore()
const { formatHHMM } = useLocaleTime()

const gridEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (gridEl.value) {
    // 07:00 is row 28 in 15-min steps; each row is 12px.
    gridEl.value.scrollTop = 7 * 4 * 12
  }
})

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

// Precompute slot keys once per (date, hhmm) combination.
const slotGrid = computed<string[][]>(() =>
  rows.value.map((row) => columns.value.map((col) => slotKey(col, row.hhmm))),
)

// Per-drag local delta: set while dragging, reset on drag end.
const dragDelta = ref<Map<string, boolean> | null>(null)

const filled = computed<Set<string>>(() => {
  const base = store.currentSlots
  const delta = dragDelta.value
  if (!delta || delta.size === 0) return base
  const out = new Set(base)
  for (const [slot, fill] of delta) {
    if (fill) out.add(slot)
    else out.delete(slot)
  }
  return out
})

let saveTimer: ReturnType<typeof setTimeout> | null = null
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
let savedResetTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave() {
  saveState.value = 'saving'
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(doSave, 300)
}

async function doSave() {
  try {
    // Capture the effective filled set (base + delta), apply via store
    // (which optimistically updates currentSlots), then drop the delta.
    const next = Array.from(filled.value)
    dragDelta.value = null
    await store.saveAvailability(next)
    saveState.value = 'saved'
    if (savedResetTimer) clearTimeout(savedResetTimer)
    savedResetTimer = setTimeout(() => {
      if (saveState.value === 'saved') saveState.value = 'idle'
    }, 2000)
  } catch {
    saveState.value = 'idle'
  }
}

const drag = useDragSelect({
  isFilled: (slot) => filled.value.has(slot),
  onEnter: (slot, mode) => {
    const delta = dragDelta.value ?? new Map<string, boolean>()
    delta.set(slot, mode === 'fill')
    dragDelta.value = new Map(delta)
  },
  onEnd: () => {
    scheduleSave()
  },
})

function onCellMouseDown(slot: string, e: MouseEvent) {
  if (!dragDelta.value) dragDelta.value = new Map()
  drag.start(slot, e)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-300">
        Your availability
      </h3>
      <span
        data-testid="save-indicator"
        class="text-xs px-2 py-1 rounded-full"
        :class="{
          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400':
            saveState === 'idle',
          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300':
            saveState === 'saving',
          'bg-brand-100 text-brand-700 dark:bg-brand-700/40 dark:text-brand-200':
            saveState === 'saved',
        }"
      >
        <template v-if="saveState === 'saving'">Saving…</template>
        <template v-else-if="saveState === 'saved'">Saved</template>
        <template v-else>Idle</template>
      </span>
    </div>

    <div
      ref="gridEl"
      data-testid="personal-grid"
      class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[480px] overflow-auto"
      :class="{ 'no-select': drag.dragging.value }"
    >
      <div
        class="grid"
        :style="{
          gridTemplateColumns: `minmax(70px, auto) repeat(${columns.length}, minmax(60px, 1fr))`,
        }"
      >
        <div class="sticky top-0 left-0 z-20 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200 dark:border-slate-800" />
        <div
          v-for="col in columns"
          :key="'col-' + col"
          data-testid="slot-column-header"
          :data-date="col"
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

        <template v-for="(row, ri) in rows" :key="row.hhmm">
          <div
            data-testid="slot-row-header"
            :data-time="row.hhmm"
            class="sticky left-0 z-10 bg-slate-50 dark:bg-slate-950 text-[11px] text-right pr-2 pl-1 text-slate-500 dark:text-slate-400 border-r border-b border-slate-100 dark:border-slate-800 leading-none flex items-center justify-end"
            :class="{ 'opacity-0': !row.isHour }"
            style="height: 12px"
          >
            <span v-if="row.isHour">{{ row.label }}</span>
          </div>
          <div
            v-for="slot in slotGrid[ri]"
            :key="slot"
            data-testid="slot-cell"
            :data-slot="slot"
            :data-filled="filled.has(slot) ? 'true' : 'false'"
            class="border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
            :class="[
              filled.has(slot)
                ? 'bg-brand-500 hover:bg-brand-600'
                : 'bg-white hover:bg-brand-100 dark:bg-slate-900 dark:hover:bg-brand-700/40',
              row.isHour && 'border-t border-slate-200 dark:border-slate-800',
            ]"
            style="height: 12px"
            @mousedown="onCellMouseDown(slot, $event)"
          />
        </template>
      </div>
    </div>
  </div>
</template>
