import type { EventData } from '@/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function useEventApi() {
  function createEvent(name: string, dates: string[]): Promise<{ id: string }> {
    return request<{ id: string }>('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, dates }),
    })
  }

  function getEvent(id: string): Promise<EventData> {
    return request<EventData>(`/api/events/${encodeURIComponent(id)}`)
  }

  function upsertAvailability(id: string, name: string, slots: string[]): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/api/events/${encodeURIComponent(id)}/availability`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, slots }),
    })
  }

  function deleteAvailability(id: string, name: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(
      `/api/events/${encodeURIComponent(id)}/availability/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    )
  }

  return { createEvent, getEvent, upsertAvailability, deleteAvailability }
}
