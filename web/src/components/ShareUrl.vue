<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  eventId: string
}>()

const url = computed(() =>
  typeof window !== 'undefined' ? `${window.location.origin}/${props.eventId}` : `/${props.eventId}`,
)

const copied = ref(false)
const copyFailed = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  copied.value = false
  copyFailed.value = false
  try {
    await navigator.clipboard.writeText(url.value)
    copied.value = true
  } catch {
    copyFailed.value = true
  }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
    copyFailed.value = false
  }, 2000)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <input
      data-testid="share-url"
      :value="url"
      readonly
      class="flex-1 min-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
      @focus="($event.target as HTMLInputElement).select()"
    />
    <button
      type="button"
      data-testid="copy-share-url"
      class="inline-flex items-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-2 text-sm font-medium hover:opacity-90 transition"
      @click="copy"
    >
      Copy
    </button>
    <span
      v-if="copied"
      data-testid="share-url-copied"
      class="inline-flex items-center rounded-full bg-brand-100 dark:bg-brand-700/40 text-brand-700 dark:text-brand-200 text-xs px-2 py-1"
      role="status"
    >
      Copied!
    </span>
    <span
      v-else-if="copyFailed"
      data-testid="share-url-copy-failed"
      class="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 text-xs px-2 py-1"
      role="status"
    >
      Copy failed
    </span>
  </div>
</template>
