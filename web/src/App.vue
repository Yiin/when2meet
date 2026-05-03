<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
import TimeFormatToggle from '@/components/TimeFormatToggle.vue'
// Ensure the theme composable runs at app boot so <html> reflects the stored
// or preferred theme before any route paints.
import '@/composables/useTheme'
</script>

<template>
  <div class="max-w-[720px] mx-auto px-6 pt-12 pb-24">
    <header class="flex items-center justify-between mb-12">
      <RouterLink
        to="/"
        data-testid="nav-home"
        class="font-serif italic text-2xl text-ink"
      >
        meet<span class="text-accent">.</span>
      </RouterLink>
      <div class="flex items-center gap-4">
        <TimeFormatToggle />
        <ThemeToggle />
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
