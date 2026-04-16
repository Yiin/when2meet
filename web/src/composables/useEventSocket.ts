import { onBeforeUnmount, watch, type Ref } from 'vue'
import type { EventData } from '@/types'
import type { WsClientMessage, WsServerMessage } from '@/lib/ws'

let sharedSocket: WebSocket | null = null
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

type Listener = (event: EventData) => void
const listeners = new Set<Listener>()
const subscribers = new Set<() => string | null>()

function getWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}

function openSocket(): WebSocket {
  if (sharedSocket && sharedSocket.readyState <= WebSocket.OPEN) return sharedSocket
  const ws = new WebSocket(getWsUrl())
  sharedSocket = ws
  ws.addEventListener('open', () => {
    reconnectAttempts = 0
  })
  ws.addEventListener('message', (evt) => {
    let data: WsServerMessage | null = null
    try {
      data = JSON.parse(evt.data)
    } catch {
      return
    }
    if (data?.type === 'event' && data.event) {
      for (const fn of listeners) fn(data.event)
    }
  })
  ws.addEventListener('close', () => {
    if (sharedSocket === ws) sharedSocket = null
    if (listeners.size === 0) return
    const delay = Math.min(5000, 250 * 2 ** reconnectAttempts) + Math.random() * 250
    reconnectAttempts++
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      const next = openSocket()
      // Re-subscribe all active subscribers' current event ids.
      for (const getId of subscribers) {
        const id = getId()
        if (id) sendWhenReady(next, { type: 'subscribe', eventId: id })
      }
    }, delay)
  })
  return ws
}

function sendWhenReady(ws: WebSocket, msg: WsClientMessage) {
  const payload = JSON.stringify(msg)
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(payload)
  } else {
    ws.addEventListener('open', () => ws.send(payload), { once: true })
  }
}

export function useEventSocket(
  eventIdRef: Ref<string | null> | Ref<string>,
  onEvent: (event: EventData) => void,
) {
  const listener: Listener = (event) => {
    if (eventIdRef.value && event.id === eventIdRef.value) {
      onEvent(event)
    }
  }
  listeners.add(listener)

  let subscribedId: string | null = null
  const currentIdGetter = () => subscribedId
  subscribers.add(currentIdGetter)

  const stop = watch(
    () => eventIdRef.value,
    (id) => {
      const ws = openSocket()
      if (subscribedId && subscribedId !== id) {
        sendWhenReady(ws, { type: 'unsubscribe', eventId: subscribedId })
      }
      if (id) {
        sendWhenReady(ws, { type: 'subscribe', eventId: id })
        subscribedId = id
      } else {
        subscribedId = null
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    listeners.delete(listener)
    subscribers.delete(currentIdGetter)
    if (subscribedId && sharedSocket) {
      sendWhenReady(sharedSocket, { type: 'unsubscribe', eventId: subscribedId })
    }
    stop()
  })
}
