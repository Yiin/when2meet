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
    <div class="flex-1">
      <input
        v-model="name"
        data-testid="participant-name-input"
        type="text"
        placeholder="enter your name"
        autocomplete="off"
        class="text-input"
      />
    </div>
    <button
      type="submit"
      data-testid="join-submit"
      class="font-mono text-sm text-accent border-b border-accent pb-1 transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="!name.trim()"
    >
      join
    </button>
  </form>
</template>
