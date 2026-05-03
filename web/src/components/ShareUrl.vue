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
  <div class="flex items-baseline gap-3">
    <input
      data-testid="share-url"
      :value="url"
      readonly
      class="text-input flex-1 min-w-0 font-mono text-sm text-ink-soft"
      @focus="($event.target as HTMLInputElement).select()"
    />
    <button
      v-if="copied"
      type="button"
      data-testid="share-url-copied"
      class="btn-link font-mono text-xs text-accent"
      role="status"
      @click="copy"
    >
      copied
    </button>
    <button
      v-else-if="copyFailed"
      type="button"
      data-testid="share-url-copy-failed"
      class="btn-link font-mono text-xs text-ink-faint hover:text-ink"
      role="status"
      @click="copy"
    >
      failed
    </button>
    <button
      v-else
      type="button"
      data-testid="copy-share-url"
      class="btn-link font-mono text-xs text-ink-faint hover:text-ink"
      @click="copy"
    >
      copy
    </button>
  </div>
</template>
