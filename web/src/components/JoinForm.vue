<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  initialName?: string
}>()

const emit = defineEmits<{
  (e: 'join', name: string): void
}>()

const name = ref(props.initialName ?? '')

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  emit('join', trimmed)
}
</script>

<template>
  <form
    data-testid="join-form"
    class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm"
    @submit.prevent="submit"
  >
    <label class="flex-1 flex flex-col gap-1">
      <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
        Your name
      </span>
      <input
        v-model="name"
        data-testid="participant-name-input"
        type="text"
        placeholder="Enter your name"
        autocomplete="off"
        class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </label>
    <button
      type="submit"
      data-testid="join-submit"
      class="inline-flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 transition disabled:opacity-50"
      :disabled="!name.trim()"
    >
      Join
    </button>
  </form>
</template>
