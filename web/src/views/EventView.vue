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
  <div v-if="notFound" class="py-20">
    <h2 class="font-serif italic text-3xl text-ink">
      event not found
    </h2>
    <p class="mt-2 font-mono text-sm text-ink-faint">
      that link doesn't point to an active event.
    </p>
  </div>

  <div v-else-if="event">
    <header>
      <h1
        v-if="event.name"
        data-testid="event-name"
        class="font-serif italic text-3xl text-ink leading-none"
      >
        {{ event.name }}
      </h1>
      <h1
        v-else
        data-testid="event-name"
        class="font-serif italic text-3xl text-ink-faint leading-none"
      >
        untitled
      </h1>
      <p
        data-testid="event-dates"
        class="mt-3 font-mono text-xs text-ink-faint"
      >
        {{ formattedDates }}
      </p>
      <p
        v-if="currentName"
        class="mt-1 font-mono text-xs text-ink-faint"
      >
        joined as
        <span
          data-testid="current-participant"
          class="text-ink-soft"
        >{{ currentName }}</span>
      </p>
    </header>

    <section class="mt-10">
      <h2 class="font-mono text-xs uppercase tracking-wide text-ink-soft">
        share
      </h2>
      <div class="cat-rule mt-2 mb-4" />
      <ShareUrl :event-id="event.id" />
    </section>

    <section v-if="!currentName" class="mt-10">
      <h2 class="font-mono text-xs uppercase tracking-wide text-ink-soft">
        join
      </h2>
      <div class="cat-rule mt-2 mb-4" />
      <JoinForm @join="handleJoin" />
    </section>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-10">
      <section v-if="currentName" class="mt-10">
        <h2 class="font-mono text-xs uppercase tracking-wide text-ink-soft">
          your availability
        </h2>
        <div class="cat-rule mt-2 mb-4" />
        <PersonalGrid />
      </section>
      <section class="mt-10">
        <h2 class="font-mono text-xs uppercase tracking-wide text-ink-soft">
          everyone
        </h2>
        <div class="cat-rule mt-2 mb-4" />
        <GroupGrid />
      </section>
    </div>
  </div>

  <div v-else class="py-20 font-mono text-sm text-ink-faint">
    loading...
  </div>
</template>
