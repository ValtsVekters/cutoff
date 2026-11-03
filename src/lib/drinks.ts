import type { Drink } from './caffeine'
// .ts extension so Node's test runner can load this module directly.
import { atClock, dayKey } from './time.ts'

export type Preset = { name: string; size?: string; mg: number }

// Caffeine per serving, from can labels (Bloom: US can; Canadian cans list 140 mg).
export const PRESETS: Preset[] = [
  { name: 'Cola', size: '330 ml', mg: 34 },
  { name: 'Bloom', size: '355 ml', mg: 180 },
  { name: 'Red Bull', size: '250 ml', mg: 80 },
  { name: 'Monster', size: '500 ml', mg: 160 },
  { name: 'Coffee', size: '250 ml', mg: 95 },
  { name: 'Espresso', mg: 63 },
  { name: 'Green tea', size: '250 ml', mg: 28 },
]

export const label = (p: Preset) => (p.size ? `${p.name} ${p.size}` : p.name)

const HOUR = 3_600_000
const DAY = 24 * HOUR

// Seeded random numbers, so the sample history looks the same on every load.
function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
}

/**
 * About two months of believable sample days before `from` (the 06:00 start
 * of today): 1–4 drinks from the presets between 7 AM and 9 PM, with the
 * odd caffeine-free day.
 */
export function sampleHistory(from: number, days = 60): Drink[] {
  const out: Drink[] = []
  for (let i = 1; i <= days; i++) {
    const start = from - i * DAY
    const rand = seeded(Math.floor(start / DAY))
    if (rand() < 0.1) continue
    const count = 1 + Math.floor(rand() * 4)
    let hour = 7 + rand() * 2
    for (let k = 0; k < count && hour < 21; k++) {
      const p = PRESETS[Math.floor(rand() * PRESETS.length)]
      const quarterHours = Math.round((hour - 6) * 4)
      out.push({ id: `sample-${i}-${k}`, name: label(p), mg: p.mg, time: start + quarterHours * (HOUR / 4) })
      hour += 2 + rand() * 4
    }
  }
  return out
}

export const DEMO_DAY: { name: string; mg: number; at: string }[] = [
  { name: 'Coffee 250 ml', mg: 95, at: '08:00' },
  { name: 'Espresso', mg: 63, at: '11:30' },
  { name: 'Monster 500 ml', mg: 160, at: '16:00' },
  { name: 'Cola 330 ml', mg: 34, at: '19:00' },
]

/**
 * The demo: today's drinks replaced by DEMO_DAY, and every empty day of the
 * last two months filled with sample history. Days already logged are kept.
 */
export function withDemo(existing: Drink[], from: number, newId: () => string): Drink[] {
  const past = existing.filter((d) => d.time < from)
  const loggedDays = new Set(past.map((d) => dayKey(d.time)))
  return [
    ...past,
    ...sampleHistory(from).filter((d) => !loggedDays.has(dayKey(d.time))),
    ...DEMO_DAY.map((d) => ({ id: newId(), name: d.name, mg: d.mg, time: atClock(d.at, from) })),
  ]
}
