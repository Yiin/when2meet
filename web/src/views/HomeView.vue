<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CalendarPicker from '@/components/CalendarPicker.vue'
import { useEventStore } from '@/stores/event'

const router = useRouter()
const store = useEventStore()

const name = ref('')
const dates = ref<string[]>([])
const submitting = ref(false)

const canSubmit = computed(
  () => name.value.trim().length > 0 && dates.value.length > 0 && !submitting.value,
)

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const id = await store.create(name.value.trim(), dates.value)
    router.push(`/${id}`)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-10">
      <h1 class="font-serif italic text-4xl text-ink leading-none">
        Plan a meeting<span class="text-accent">.</span>
      </h1>
      <p class="mt-3 font-mono text-sm text-ink-faint">
        Pick dates, share the link, let everyone paint their availability.
      </p>
    </header>

    <form
      data-testid="create-event-form"
      class="flex flex-col"
      @submit.prevent="submit"
    >
      <section class="pb-8">
        <label class="block">
          <span class="font-mono text-xs text-ink-soft uppercase tracking-wide">
            Event name
          </span>
          <input
            v-model="name"
            data-testid="event-name-input"
            type="text"
            placeholder="Team sync"
            autocomplete="off"
            class="text-input-serif mt-2"
          />
        </label>
      </section>

      <div class="cat-rule" />

      <section class="py-8">
        <div class="mb-4 flex items-baseline justify-between">
          <span class="font-mono text-xs text-ink-soft uppercase tracking-wide">
            Dates
          </span>
          <span class="font-mono text-xs text-ink-faint">
            {{
              dates.length === 0
                ? 'choose at least one'
                : `${dates.length} selected`
            }}
          </span>
        </div>
        <CalendarPicker v-model="dates" />
      </section>

      <div class="cat-rule" />

      <section class="pt-8">
        <button
          type="submit"
          data-testid="create-event-submit"
          class="btn-bordered disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!canSubmit"
        >
          {{ submitting ? 'creating…' : 'create event' }}
        </button>
      </section>
    </form>
  </div>
</template>
