import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { EventData, Participant } from '@/types'
import { useEventApi } from '@/composables/useEventApi'

export const useEventStore = defineStore('event', () => {
  const api = useEventApi()

  const event = ref<EventData | null>(null)
  const currentName = ref<string | null>(null)
  const loading = ref(false)

  const participants = computed<Participant[]>(() => event.value?.participants ?? [])
  const dates = computed<string[]>(() => event.value?.dates ?? [])

  const currentParticipant = computed<Participant | null>(() => {
    if (!currentName.value) return null
    return (
      participants.value.find(
        (p) => p.name.toLowerCase() === currentName.value!.toLowerCase(),
      ) ?? null
    )
  })

  const currentSlots = computed<Set<string>>(() => {
    const p = currentParticipant.value
    return new Set(p?.slots ?? [])
  })

  async function load(id: string) {
    loading.value = true
    try {
      event.value = await api.getEvent(id)
    } catch (err) {
      event.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  function setEvent(e: EventData) {
    if (JSON.stringify(event.value) === JSON.stringify(e)) return
    event.value = e
  }

  function setCurrentName(name: string | null) {
    currentName.value = name
  }

  async function create(name: string, dates: string[]): Promise<string> {
    const { id } = await api.createEvent(name, dates)
    return id
  }

  function applyLocalAvailability(name: string, slots: string[]) {
    if (!event.value) return
    const existing = event.value.participants.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    )
    if (existing) {
      existing.slots = [...slots]
    } else {
      event.value.participants.push({ name, slots: [...slots] })
    }
  }

  async function saveAvailability(slots: string[]): Promise<void> {
    if (!event.value || !currentName.value) return
    const snapshot = JSON.parse(JSON.stringify(event.value)) as EventData
    applyLocalAvailability(currentName.value, slots)
    try {
      await api.upsertAvailability(event.value.id, currentName.value, slots)
    } catch (err) {
      event.value = snapshot
      throw err
    }
  }

  function reset() {
    event.value = null
    currentName.value = null
  }

  return {
    event,
    currentName,
    loading,
    participants,
    dates,
    currentParticipant,
    currentSlots,
    load,
    setEvent,
    setCurrentName,
    create,
    saveAvailability,
    reset,
  }
})
