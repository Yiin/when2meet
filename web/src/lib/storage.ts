export const STORAGE_KEYS = {
  theme: 'w2m-theme',
  hourCycle: 'w2m-hour-cycle',
  recent: 'w2m-recent',
  nameFor: (eventId: string) => `w2m-name:${eventId}`,
} as const
