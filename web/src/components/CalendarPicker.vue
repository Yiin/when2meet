<script setup lang="ts">
import { computed, ref } from 'vue'
import { isoForLocalDate } from '@/lib/slots'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const today = new Date()
today.setHours(0, 0, 0, 0)

const cursor = ref(new Date(today.getFullYear(), today.getMonth(), 1))

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(cursor.value),
)

interface Cell {
  date: Date
  iso: string
  inMonth: boolean
  disabled: boolean
  selected: boolean
}

const cells = computed<Cell[]>(() => {
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1)
  // Start grid on Monday (0..6 where 0=Mon ... 6=Sun).
  const dayIndex = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - dayIndex)

  const out: Cell[] = []
  const selectedSet = new Set(props.modelValue)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    d.setHours(0, 0, 0, 0)
    const iso = isoForLocalDate(d)
    out.push({
      date: d,
      iso,
      inMonth: d.getMonth() === cursor.value.getMonth(),
      disabled: d.getTime() < today.getTime(),
      selected: selectedSet.has(iso),
    })
  }
  return out
})

function prev() {
  cursor.value = new Date(
    cursor.value.getFullYear(),
    cursor.value.getMonth() - 1,
    1,
  )
}
function next() {
  cursor.value = new Date(
    cursor.value.getFullYear(),
    cursor.value.getMonth() + 1,
    1,
  )
}

function toggle(cell: Cell) {
  if (cell.disabled) return
  const set = new Set(props.modelValue)
  if (set.has(cell.iso)) set.delete(cell.iso)
  else set.add(cell.iso)
  emit('update:modelValue', Array.from(set).sort())
}

const weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
</script>

<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-3">
      <button
        type="button"
        data-testid="date-picker-prev-month"
        class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        @click="prev"
        aria-label="Previous month"
      >
        &lsaquo;
      </button>
      <div
        data-testid="date-picker-month-label"
        class="font-medium text-slate-700 dark:text-slate-200"
      >
        {{ monthLabel }}
      </div>
      <button
        type="button"
        data-testid="date-picker-next-month"
        class="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        @click="next"
        aria-label="Next month"
      >
        &rsaquo;
      </button>
    </div>

    <div data-testid="date-picker" class="grid grid-cols-7 gap-1 select-none">
      <div
        v-for="w in weekdayLabels"
        :key="w"
        class="text-center text-xs font-medium text-slate-400 dark:text-slate-500 py-1"
      >
        {{ w }}
      </div>
      <button
        v-for="cell in cells"
        :key="cell.iso"
        type="button"
        data-testid="date-cell"
        :data-date="cell.iso"
        :data-selected="cell.selected ? 'true' : undefined"
        :data-disabled="cell.disabled ? 'true' : undefined"
        :disabled="cell.disabled"
        :class="[
          'aspect-square rounded text-sm font-medium transition',
          !cell.inMonth && 'opacity-40',
          cell.disabled &&
            'cursor-not-allowed text-slate-300 dark:text-slate-700',
          !cell.disabled &&
            !cell.selected &&
            'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200',
          cell.selected &&
            'bg-brand-500 text-white hover:bg-brand-600',
        ]"
        @click="toggle(cell)"
      >
        {{ cell.date.getDate() }}
      </button>
    </div>
  </div>
</template>
