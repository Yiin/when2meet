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
  <div class="flex flex-col items-center">
    <div class="w-full max-w-4xl">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
        Plan a meeting
      </h1>
      <p class="text-slate-500 dark:text-slate-400 mb-8">
        Pick dates, share the link, let everyone paint their availability.
      </p>

      <form
        data-testid="create-event-form"
        class="grid grid-cols-1 lg:grid-cols-2 gap-6"
        @submit.prevent="submit"
      >
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
              Event name
            </span>
            <input
              v-model="name"
              data-testid="event-name-input"
              type="text"
              placeholder="Team sync"
              autocomplete="off"
              class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          <div class="mt-6 flex flex-col gap-2">
            <span class="text-sm font-medium text-slate-600 dark:text-slate-300">
              {{ dates.length === 0 ? 'Choose at least one date' : `${dates.length} date${dates.length === 1 ? '' : 's'} selected` }}
            </span>
          </div>

          <button
            type="submit"
            data-testid="create-event-submit"
            class="mt-6 w-full inline-flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canSubmit"
          >
            Create event
          </button>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
          <CalendarPicker v-model="dates" />
        </div>
      </form>
    </div>
  </div>
</template>
