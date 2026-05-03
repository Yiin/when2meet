<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    data-testid="theme-toggle"
    class="font-mono text-xs text-ink-faint hover:text-ink transition-colors"
    :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggle"
  >
    {{ theme === 'dark' ? 'light' : 'dark' }}
  </button>
</template>
