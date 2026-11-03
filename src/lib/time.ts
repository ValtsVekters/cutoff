// The app's "day" runs 06:00 → 06:00, so a 01:00 bedtime belongs to tonight.
const DAY_START_HOUR = 6

export function dayStart(now: number): number {
  const d = new Date(now)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  if (now < d.getTime()) d.setDate(d.getDate() - 1)
  return d.getTime()
}

/** "HH:MM" → timestamp inside the day window that starts at `start`. */
export function atClock(hhmm: string, start: number): number {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(start)
  d.setHours(h, m, 0, 0)
  if (h < DAY_START_HOUR) d.setDate(d.getDate() + 1)
  return d.getTime()
}

export function clock(t: number): string {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Calendar key ("2026-11-03") of the app-day a timestamp belongs to. */
export function dayKey(t: number): string {
  const d = new Date(dayStart(t))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
