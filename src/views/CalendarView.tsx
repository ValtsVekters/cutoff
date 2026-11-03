import { useState } from 'react'
import { DAILY_LIMIT_MG, type Drink } from '../lib/caffeine'
import { clock, dayKey } from '../lib/time'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const keyOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// Colour a day by its total against the 400 mg/day guideline.
function shade(total: number): string {
  if (total === 0) return ''
  if (total > DAILY_LIMIT_MG) return 'bg-rose-500 text-white'
  if (total > DAILY_LIMIT_MG / 2) return 'bg-[var(--accent)] text-white'
  return 'bg-[var(--accent)]/20'
}

type Props = { now: number; drinks: Drink[] }

export function CalendarView({ now, drinks }: Props) {
  const todayKey = dayKey(now)
  const [month, setMonth] = useState(() => {
    const d = new Date(now)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [selected, setSelected] = useState(todayKey)

  // Group every logged drink into its app-day (06:00 → 06:00).
  const byDay = new Map<string, Drink[]>()
  for (const d of drinks) {
    const k = dayKey(d.time)
    byDay.set(k, [...(byDay.get(k) ?? []), d])
  }
  const totalOf = (k: string) => (byDay.get(k) ?? []).reduce((s, d) => s + d.mg, 0)

  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate()
  const lead = (new Date(month.y, month.m, 1).getDay() + 6) % 7 // Monday-first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const monthKeys = Array.from({ length: daysInMonth }, (_, i) => keyOf(month.y, month.m, i + 1))
  const loggedDays = monthKeys.filter((k) => totalOf(k) > 0)
  const avg = loggedDays.length ? Math.round(loggedDays.reduce((s, k) => s + totalOf(k), 0) / loggedDays.length) : 0
  const overDays = loggedDays.filter((k) => totalOf(k) > DAILY_LIMIT_MG).length

  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const dayDrinks = (byDay.get(selected) ?? []).slice().sort((a, b) => a.time - b.time)
  const [sy, sm, sd] = selected.split('-').map(Number)
  const selectedLabel = new Date(sy, sm - 1, sd).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="grid size-8 place-items-center rounded-full hover:bg-[var(--grid)]" aria-label="Previous month">‹</button>
          <h2 className="font-semibold">
            {new Date(month.y, month.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => shift(1)} className="grid size-8 place-items-center rounded-full hover:bg-[var(--grid)]" aria-label="Next month">›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--muted)]">
          {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <span key={`pad-${i}`} />
            const k = keyOf(month.y, month.m, day)
            const total = totalOf(k)
            return (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${shade(total)} ${
                  k === selected ? 'ring-2 ring-[var(--ink)]' : ''
                } ${k === todayKey && !total ? 'font-semibold text-[var(--accent)]' : ''}`}
              >
                <span className="leading-none">{day}</span>
                {total > 0 && <span className="num mt-0.5 text-[9px] leading-none opacity-80">{total}</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 text-[11px] text-[var(--muted)]">
          <span className="flex items-center gap-1"><i className="size-2.5 rounded bg-[var(--accent)]/20" />≤ 200</span>
          <span className="flex items-center gap-1"><i className="size-2.5 rounded bg-[var(--accent)]" />≤ 400</span>
          <span className="flex items-center gap-1"><i className="size-2.5 rounded bg-rose-500" />over 400 mg</span>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Stat value={loggedDays.length} label="days logged" />
        <Stat value={`${avg}`} label="avg mg / day" />
        <Stat value={overDays} label="days over 400" />
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between text-sm">
          <h2 className="font-medium">{selectedLabel}</h2>
          <span className="num text-[var(--muted)]">{totalOf(selected)} mg</span>
        </div>
        {dayDrinks.length === 0 ? (
          <p className="py-3 text-center text-sm text-[var(--muted)]">No caffeine logged.</p>
        ) : (
          <ul className="divide-y divide-[var(--grid)]">
            {dayDrinks.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="num text-[var(--muted)]">{clock(d.time)}</span>
                <span className="flex-1">{d.name}</span>
                <span className="num text-[var(--muted)]">{d.mg} mg</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="card px-2 py-3">
      <div className="num text-2xl font-semibold">{value}</div>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
    </div>
  )
}
