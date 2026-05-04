<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEventStore } from '@/stores/event'
import { useEventSocket } from '@/composables/useEventSocket'
import { STORAGE_KEYS } from '@/lib/storage'
import { recordRecent } from '@/lib/recent'
import { formatDate } from '@/composables/useLocaleTime'
import JoinForm from '@/components/JoinForm.vue'
import ShareUrl from '@/components/ShareUrl.vue'
import PersonalGrid from '@/components/PersonalGrid.vue'
import GroupGrid from '@/components/GroupGrid.vue'

const props = defineProps<{ eventId: string }>()

const store = useEventStore()
const { event, currentName } = storeToRefs(store)

const notFound = ref(false)
const activeTab = ref<'personal' | 'group'>('group')

watch(
  currentName,
  (name, prev) => {
    // Default to the personal tab on join; leave the user's choice alone otherwise.
    if (name && !prev) activeTab.value = 'personal'
  },
  { immediate: true },
)

const participantCount = computed(() => event.value?.participants.length ?? 0)

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

watch(
  event,
  (e) => {
    if (e) recordRecent(e.id, e.name, e.dates)
  },
  { immediate: true },
)

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
        add yourself
      </h2>
      <div class="cat-rule mt-2" />
      <p class="font-mono text-sm text-ink-faint mb-4">
        Enter your name so you can paint when you're free.
      </p>
      <JoinForm @join="handleJoin" />
    </section>

    <section class="mt-10">
      <div class="flex items-baseline justify-between gap-4 flex-wrap">
        <div class="flex items-baseline gap-7">
          <button
            v-if="currentName"
            type="button"
            class="schedule-tab"
            :class="{ 'schedule-tab--active': activeTab === 'personal' }"
            @click="activeTab = 'personal'"
          >
            your availability
          </button>
          <button
            type="button"
            class="schedule-tab"
            :class="{ 'schedule-tab--active': activeTab === 'group' }"
            @click="activeTab = 'group'"
          >
            everyone
          </button>
        </div>
        <span class="font-mono text-xs text-ink-faint">
          <span data-testid="participant-count">{{ participantCount }}</span>
          {{ participantCount === 1 ? 'person' : 'people' }}
        </span>
      </div>
      <div class="cat-rule mt-2 mb-4" />

      <PersonalGrid v-if="currentName" v-show="activeTab === 'personal'" />
      <GroupGrid v-show="!currentName || activeTab === 'group'" />
    </section>
  </div>

  <div v-else class="py-20 font-mono text-sm text-ink-faint">
    loading...
  </div>
</template>

<style scoped>
.schedule-tab {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-faint);
  padding-bottom: 0.25rem;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease;
}

.schedule-tab:hover {
  color: var(--ink-soft);
}

.schedule-tab--active {
  color: var(--ink);
  border-bottom-color: var(--ink);
}
</style>
