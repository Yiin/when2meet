<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventStore } from '@/stores/event'
import { useLocaleTime } from '@/composables/useLocaleTime'
import { slotKey, timeRows } from '@/lib/slots'

interface Props {
  rowHeight?: number
  /**
   * Whether to emit `data-testid="slot-row-header"` /
   * `data-testid="slot-column-header"` on the header cells. Only ONE grid
   * on the page should set this to true so e2e selectors stay unique.
   */
  headerTestIds?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rowHeight: 16,
  headerTestIds: false,
})

const store = useEventStore()
const { formatHHMM } = useLocaleTime()

const containerRef = ref<HTMLElement | null>(null)

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

interface CellInfo {
  slot: string
  date: string
  hhmm: string
  isHour: boolean
  ci: number
}

// Precompute cells per row.
const cellGrid = computed<CellInfo[][]>(() =>
  rows.value.map((row) =>
    columns.value.map((date, ci) => ({
      slot: slotKey(date, row.hhmm),
      date,
      hhmm: row.hhmm,
      isHour: row.isHour,
      ci,
    })),
  ),
)

const rowStyle = computed(() => `height: ${props.rowHeight}px`)

defineExpose({
  containerRef,
  rowHeight: () => props.rowHeight,
})
</script>

<template>
  <div ref="containerRef" class="bg-paper">
    <div
      class="grid relative"
      :style="{
        gridTemplateColumns: `minmax(70px, auto) repeat(${columns.length}, minmax(60px, 1fr))`,
      }"
    >
      <div class="sticky top-0 left-0 z-20 bg-paper border-b border-r border-rule" />
      <div
        v-for="col in columns"
        :key="'col-' + col"
        :data-testid="headerTestIds ? 'slot-column-header' : undefined"
        :data-date="col"
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

      <template v-for="(row, ri) in rows" :key="row.hhmm">
        <div
          :data-testid="headerTestIds ? 'slot-row-header' : undefined"
          :data-time="row.hhmm"
          class="sticky left-0 z-10 bg-paper font-mono text-[10px] text-right pr-2 pl-1 text-ink-faint leading-none flex items-center justify-end border-r border-rule"
          :class="{
            'opacity-0': !row.isHour,
            'border-t border-rule': row.isHour,
          }"
          :style="rowStyle"
        >
          <span v-if="row.isHour">{{ row.label }}</span>
        </div>
        <slot
          v-for="cell in cellGrid[ri]"
          name="cell"
          :key="cell.slot"
          :slot-key="cell.slot"
          :hhmm="cell.hhmm"
          :date="cell.date"
          :is-hour="cell.isHour"
          :ri="ri"
          :ci="cell.ci"
          :row-height="rowHeight"
        />
      </template>
    </div>
  </div>
</template>
