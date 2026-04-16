export const pad = (n: number) => String(n).padStart(2, '0')

export function slotKey(dateISO: string, hhmm: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0).toISOString()
}

export function timeRows(): { hhmm: string }[] {
  const rows: { hhmm: string }[] = []
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 15)
      rows.push({ hhmm: `${pad(h)}:${pad(m)}` })
  return rows
}

export function isoForLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
