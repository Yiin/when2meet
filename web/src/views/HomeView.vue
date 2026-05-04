<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CalendarPicker from '@/components/CalendarPicker.vue'
import { useEventStore } from '@/stores/event'
import { clearRecent, getRecent, type RecentEvent } from '@/lib/recent'
import { formatDate } from '@/composables/useLocaleTime'

const router = useRouter()
const store = useEventStore()

const name = ref('')
const dates = ref<string[]>([])
const submitting = ref(false)
const recents = ref<RecentEvent[]>(getRecent())

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

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return formatDate(new Date(ts).toISOString().slice(0, 10), {
    month: 'short',
    day: 'numeric',
  })
}

function formatDates(ds: string[]): string {
  if (ds.length === 0) return ''
  const sorted = [...ds].sort()
  const first = formatDate(sorted[0]!, { month: 'short', day: 'numeric' })
  if (sorted.length === 1) return first
  const last = formatDate(sorted[sorted.length - 1]!, { month: 'short', day: 'numeric' })
  return `${first} – ${last} · ${sorted.length} dates`
}

function onClearHistory() {
  if (!confirm('clear history?')) return
  clearRecent()
  recents.value = []
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

    <section v-if="recents.length" data-testid="recent-events" class="mt-16">
      <h2 class="font-mono text-xs uppercase tracking-wide text-ink-soft">
        recent
      </h2>
      <div class="cat-rule mt-2 mb-4" />
      <div class="recent-list">
        <router-link
          v-for="entry in recents"
          :key="entry.id"
          :to="`/${entry.id}`"
          data-testid="recent-event-link"
          class="recent-row"
        >
          <span class="recent-main">
            <span class="recent-title">{{ entry.name || 'untitled' }}</span>
            <span v-if="entry.dates.length" class="recent-dates">
              {{ formatDates(entry.dates) }}
            </span>
          </span>
          <span class="recent-time">{{ formatRelative(entry.visitedAt) }}</span>
        </router-link>
      </div>
      <button
        type="button"
        class="clear-history-link mt-6"
        @click="onClearHistory"
      >
        clear history
      </button>
    </section>
  </div>
</template>
