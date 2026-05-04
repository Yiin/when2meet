<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useEventStore } from '@/stores/event'
import { useDragSelect } from '@/composables/useDragSelect'
import { useLocaleTime } from '@/composables/useLocaleTime'
import ScheduleGrid from './ScheduleGrid.vue'

const ROW_HEIGHT = 16

const store = useEventStore()
const { formatHHMM, formatDate } = useLocaleTime()

const scheduleRef = useTemplateRef<InstanceType<typeof ScheduleGrid>>('scheduleRef')

onMounted(() => {
  const container = scheduleRef.value?.containerRef
  if (container) {
    // 07:00 is row 28 in 15-min steps.
    container.scrollTop = 7 * 4 * ROW_HEIGHT
  }
})

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

interface HoverInfo {
  slot: string
  date: string
  hhmm: string
}

const hover = ref<HoverInfo | null>(null)

function onHoverEnter(info: HoverInfo) {
  hover.value = info
}
function onHoverLeave(slot: string) {
  if (hover.value?.slot === slot) hover.value = null
}

function nextHhmm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h ?? 0) * 60 + (m ?? 0) + 15
  const wrapped = total % (24 * 60)
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
    <div class="flex items-center justify-end h-4">
      <span
        data-testid="save-indicator"
        :class="[
          'font-mono text-xs transition-opacity duration-500',
          saveState === 'saving' && 'text-ink-faint',
          saveState === 'saved' && 'text-accent',
          saveState === 'idle' && 'opacity-0',
        ]"
      >
        <template v-if="saveState === 'saving'">saving…</template>
        <template v-else-if="saveState === 'saved'">saved</template>
        <template v-else>&nbsp;</template>
      </span>
    </div>

    <div
      data-testid="personal-grid"
      :class="{ 'no-select': drag.dragging.value }"
    >
      <ScheduleGrid
        ref="scheduleRef"
        :row-height="ROW_HEIGHT"
        :header-test-ids="true"
      >
        <template #cell="{ slotKey: slot, hhmm, date, isHour, rowHeight }">
          <div
            data-testid="slot-cell"
            :data-slot="slot"
            :data-filled="filled.has(slot) ? 'true' : 'false'"
            class="cell relative cursor-pointer transition-colors"
            :class="[
              filled.has(slot) ? 'cell-filled' : 'cell-empty',
              isHour && 'cell-hour',
            ]"
            :style="{ height: rowHeight + 'px' }"
            @mousedown="onCellMouseDown(slot, $event)"
            @mouseenter="onHoverEnter({ slot, date, hhmm })"
            @mouseleave="onHoverLeave(slot)"
          >
            <div
              v-if="hover && hover.slot === slot && !drag.dragging.value"
              class="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-1 min-w-max bg-paper border border-rule px-3 py-1 pointer-events-none"
              role="tooltip"
            >
              <div class="font-serif italic text-xs text-accent">
                {{ formatDay(date) }} — {{ formatRange(hhmm) }}
              </div>
            </div>
          </div>
        </template>
      </ScheduleGrid>
    </div>
  </div>
</template>

<style scoped>
.cell {
  border-right: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}

.cell-empty {
  background-color: transparent;
}

.cell-empty:hover {
  background-color: var(--paper-deep);
}

.cell-filled {
  background-color: var(--accent);
  border-right-color: var(--accent);
  border-bottom-color: var(--accent);
}

.cell-hour {
  border-top: 1px solid var(--rule);
}
</style>
