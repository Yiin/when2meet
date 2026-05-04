import { STORAGE_KEYS } from './storage'

const MAX_ENTRIES = 12

export interface RecentEvent {
  id: string
  name: string
  dates: string[]
  visitedAt: number
}

function safeRead(): RecentEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recent)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is RecentEvent =>
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        Array.isArray(entry.dates) &&
        entry.dates.every((d: unknown) => typeof d === 'string') &&
        typeof entry.visitedAt === 'number',
    )
  } catch {
    return []
  }
}

function safeWrite(store: RecentEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(store))
  } catch {
    // ignore (private mode / disabled / quota)
  }
}

export function getRecent(): RecentEvent[] {
  return [...safeRead()].sort((a, b) => b.visitedAt - a.visitedAt)
}

export function recordRecent(id: string, name: string, dates: string[]): void {
  const store = safeRead()
  const filtered = store.filter((entry) => entry.id !== id)
  filtered.unshift({ id, name, dates: [...dates], visitedAt: Date.now() })
  filtered.sort((a, b) => b.visitedAt - a.visitedAt)
  safeWrite(filtered.slice(0, MAX_ENTRIES))
}

export function removeRecent(id: string): void {
  const store = safeRead()
  safeWrite(store.filter((entry) => entry.id !== id))
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.recent)
  } catch {
    // ignore
  }
}
