<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEventStore } from '@/stores/event'
import { useEventSocket } from '@/composables/useEventSocket'
import { STORAGE_KEYS } from '@/lib/storage'
import { formatDate } from '@/composables/useLocaleTime'
import JoinForm from '@/components/JoinForm.vue'
import ShareUrl from '@/components/ShareUrl.vue'
import PersonalGrid from '@/components/PersonalGrid.vue'
import GroupGrid from '@/components/GroupGrid.vue'

const props = defineProps<{ eventId: string }>()

const store = useEventStore()
const { event, currentName } = storeToRefs(store)

const notFound = ref(false)

async function init() {
  notFound.value = false
  store.reset()
  try {
    await store.load(props.eventId)
  } catch {
    notFound.value = true
    return
  }
  // Auto-join if we have a remembered name for this event.
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.nameFor(props.eventId))
    if (stored) store.setCurrentName(stored)
  } catch {
    // localStorage might throw in private mode
  }
}

watch(() => props.eventId, init, { immediate: true })

useEventSocket(toRef(props, 'eventId'), (e) => store.setEvent(e))

function handleJoin(name: string) {
  store.setCurrentName(name)
  try {
    localStorage.setItem(STORAGE_KEYS.nameFor(props.eventId), name)
  } catch {
    // localStorage might throw in private mode
  }
  // If the participant doesn't exist yet on the server, create them with an
  // empty slot list so the count updates immediately everywhere.
  const exists = store.participants.some(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  )
  if (!exists) {
    store.saveAvailability([])
  }
}

const formattedDates = computed(() => {
  if (!event.value) return ''
  return event.value.dates
    .map((d) =>
      formatDate(d, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    )
    .join(', ')
})
</script>

<template>
  <div v-if="notFound" class="text-center py-20">
    <h2 class="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
      Event not found
    </h2>
    <p class="text-slate-500 dark:text-slate-400">
      That link doesn't point to an active event.
    </p>
  </div>

  <div v-else-if="event" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1
        data-testid="event-name"
        class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
      >
        {{ event.name }}
      </h1>
      <p
        data-testid="event-dates"
        class="text-slate-500 dark:text-slate-400 text-sm"
      >
        {{ formattedDates }}
      </p>
      <div
        v-if="currentName"
        class="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
      >
        Joined as
        <span
          data-testid="current-participant"
          class="inline-flex items-center rounded-full bg-brand-100 dark:bg-brand-700/40 text-brand-700 dark:text-brand-200 px-2 py-0.5 font-medium"
        >
          {{ currentName }}
        </span>
      </div>
    </div>

    <ShareUrl :event-id="event.id" />

    <JoinForm v-if="!currentName" @join="handleJoin" />

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <section v-if="currentName" class="flex flex-col">
        <PersonalGrid />
      </section>
      <section class="flex flex-col">
        <GroupGrid />
      </section>
    </div>
  </div>

  <div v-else class="text-slate-500 dark:text-slate-400 text-sm text-center py-20">
    Loading…
  </div>
</template>
