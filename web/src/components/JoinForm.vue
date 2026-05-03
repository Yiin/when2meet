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
    class="flex items-baseline gap-3"
    @submit.prevent="submit"
  >
    <label class="flex-1 flex flex-col gap-1">
      <span class="font-mono text-xs text-ink-soft">your name</span>
      <input
        v-model="name"
        data-testid="participant-name-input"
        type="text"
        placeholder="enter your name"
        autocomplete="off"
        class="text-input"
      />
    </label>
    <button
      type="submit"
      data-testid="join-submit"
      class="btn-bordered disabled:opacity-50"
      :disabled="!name.trim()"
    >
      join
    </button>
  </form>
</template>
