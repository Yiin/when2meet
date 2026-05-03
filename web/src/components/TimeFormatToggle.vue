<script setup lang="ts">
import { useLocaleTime } from '@/composables/useLocaleTime'

const { is12h, setHourCycle } = useLocaleTime()

function toggle() {
  setHourCycle(is12h.value ? '24h' : '12h')
}
</script>

<template>
  <button
    type="button"
    data-testid="time-format-toggle"
    class="font-mono text-xs text-ink-faint hover:text-ink transition"
    aria-label="Toggle time format"
    @click="toggle"
  >
    {{ is12h ? '24h' : '12h' }}
  </button>
</template>
