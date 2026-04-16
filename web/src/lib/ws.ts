import type { EventData } from '@/types'

export type WsClientMessage =
  | { type: 'subscribe'; eventId: string }
  | { type: 'unsubscribe'; eventId: string }

export type WsServerMessage = { type: 'event'; event: EventData }

export const wsTopicFor = (eventId: string) => `event:${eventId}`
