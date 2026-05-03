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

function isToday(d: Date) {
  return d.getTime() === today.getTime()
}

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
    <div class="flex items-center justify-between mb-4">
      <button
        type="button"
        data-testid="date-picker-prev-month"
        class="btn-link font-mono text-sm"
        @click="prev"
        aria-label="Previous month"
      >
        prev
      </button>
      <div
        data-testid="date-picker-month-label"
        class="font-serif italic text-2xl text-ink"
      >
        {{ monthLabel }}
      </div>
      <button
        type="button"
        data-testid="date-picker-next-month"
        class="btn-link font-mono text-sm"
        @click="next"
        aria-label="Next month"
      >
        next
      </button>
    </div>

    <div data-testid="date-picker" class="grid grid-cols-7 gap-1 select-none">
      <div
        v-for="w in weekdayLabels"
        :key="w"
        class="text-center font-mono text-xs text-ink-faint uppercase tracking-wide py-1"
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
          'aspect-square flex items-center justify-center font-mono text-sm transition-colors',
          cell.disabled && 'text-ink-faint opacity-40 cursor-not-allowed',
          !cell.disabled && !cell.selected && cell.inMonth && 'bg-transparent text-ink-soft hover:bg-paper-deep',
          !cell.disabled && !cell.selected && !cell.inMonth && 'bg-transparent text-ink-faint hover:bg-paper-deep',
          cell.selected && 'bg-accent text-paper',
          !cell.selected && !cell.disabled && isToday(cell.date) && 'text-accent underline underline-offset-2 decoration-1',
        ]"
        @click="toggle(cell)"
      >
        {{ cell.date.getDate() }}
      </button>
    </div>
  </div>
</template>
