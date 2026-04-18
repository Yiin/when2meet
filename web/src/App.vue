<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
// Ensure the theme composable runs at app boot so <html> reflects the stored
// or preferred theme before any route paints.
import '@/composables/useTheme'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="px-4 sm:px-8 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/50 backdrop-blur">
      <RouterLink
        to="/"
        data-testid="nav-home"
        class="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
        Meet
      </RouterLink>
      <ThemeToggle />
    </header>
    <main class="flex-1 px-4 sm:px-8 py-3 max-w-6xl w-full mx-auto">
      <RouterView />
    </main>
  </div>
</template>
