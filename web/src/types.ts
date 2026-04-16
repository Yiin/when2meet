export interface Participant {
  name: string
  slots: string[]
}

export interface EventData {
  id: string
  name: string
  dates: string[]
  participants: Participant[]
}
