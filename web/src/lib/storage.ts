export const STORAGE_KEYS = {
  theme: 'w2m-theme',
  hourCycle: 'w2m-hour-cycle',
  nameFor: (eventId: string) => `w2m-name:${eventId}`,
} as const
