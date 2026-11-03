import { useState, type FormEvent, type ReactNode } from 'react'
import { CaffeineChart } from '../components/CaffeineChart'
import {
  amountAt,
  budgetAt,
  curve,
  cutoffTime,
  DAILY_LIMIT_MG,
  MIN_DRINK_MG,
  SAFE_MG,
  upcomingPeak,
  WARN_MG,
  type Drink,
} from '../lib/caffeine'
import { label, PRESETS } from '../lib/drinks'
import { atClock, clock, dayStart } from '../lib/time'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NO_CAFFEINE_BEFORE_BED_H = 6

const STATUS = {
  good: { box: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100', dot: 'bg-emerald-500', label: 'Sleep-safe' },
  warn: { box: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100', dot: 'bg-amber-500', label: 'Might delay sleep' },
  bad: { box: 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100', dot: 'bg-rose-500', label: 'Likely to hurt sleep' },
}

type Props = {
  now: number
  drinks: Drink[]
  bedClock: string
  halfLife: number
  metabolism: ReactNode
  onAdd: (name: string, mg: number) => void
  onRemove: (id: string) => void
  onRetime: (id: string, time: number) => void
  onBedClock: (hhmm: string) => void
}

export function TodayView({ now, drinks, bedClock, halfLife, metabolism, onAdd, onRemove, onRetime, onBedClock }: Props) {
  const [customMg, setCustomMg] = useState('')

  const from = dayStart(now)
  const to = from + DAY
  const bedtime = atClock(bedClock, from)

  // Yesterday's late drinks still count toward today's curve.
  const relevant = drinks.filter((d) => d.time >= from - DAY && d.time < to)
  const today = relevant.filter((d) => d.time >= from).sort((a, b) => a.time - b.time)

  const data = curve(relevant, from, to, halfLife)
  const atBed = amountAt(relevant, bedtime, halfLife)
  const inBody = amountAt(relevant, now, halfLife)
  const peak = upcomingPeak(relevant, now, halfLife)
  const total = today.reduce((s, d) => s + d.mg, 0)

  // No caffeine in the last 6 h before bed (Drake et al., 2013), even when a
  // small drink would technically stay under the bedtime limit.
  const lastCall = bedtime - NO_CAFFEINE_BEFORE_BED_H * HOUR
  const open = now < lastCall
  const modelCutoff = open ? cutoffTime(relevant, now, bedtime, halfLife, MIN_DRINK_MG) : null
  const cutoff = modelCutoff === null ? null : Math.min(modelCutoff, lastCall)
  const budget = open ? Math.min(budgetAt(relevant, now, bedtime, halfLife), DAILY_LIMIT_MG - total) : 0
  const budgetMg = Math.floor(budget / 5) * 5
  const canTake = cutoff !== null && budgetMg >= MIN_DRINK_MG
  const status = atBed < SAFE_MG ? STATUS.good : atBed <= WARN_MG ? STATUS.warn : STATUS.bad

  const addCustom = (e: FormEvent) => {
    e.preventDefault()
    const mg = Math.round(Number(customMg))
    if (mg > 0 && mg <= 1000) {
      onAdd('Custom', mg)
      setCustomMg('')
    }
  }

  return (
    <>
      <section className={`card transition-colors duration-500 ${status.box}`}>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 font-medium opacity-80">
            <span className={`size-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <label className="flex items-center gap-1.5 opacity-80">
            Bed
            <input
              type="time"
              value={bedClock}
              onChange={(e) => e.target.value && onBedClock(e.target.value)}
              className="num rounded-lg bg-white/60 px-2 py-0.5 font-medium dark:bg-black/20"
              aria-label="Bedtime"
            />
          </label>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="num text-6xl font-semibold tracking-tight">{Math.round(atBed)}</span>
          <span className="text-lg opacity-70">mg at bedtime</span>
        </div>
        <p className="mt-3 text-base font-medium">
          {canTake ? (
            <>
              You can still take <b className="num">{budgetMg} mg</b> until <b className="num">{clock(cutoff)}</b>
            </>
          ) : (
            'No more caffeine today'
          )}
        </p>
        {canTake && (
          <p className="text-xs opacity-70">
            Less fits the later you drink. Nothing in the {NO_CAFFEINE_BEFORE_BED_H} h before bed.
          </p>
        )}

        <div className="mt-4 border-t border-current/10 pt-3 text-sm opacity-70">
          In your body now: <b className="num">{Math.round(inBody)} mg</b>
          {peak && (
            <span className="num block text-xs">
              ↑ absorbing, peaks at {Math.round(peak.mg)} mg around {clock(peak.time)}
            </span>
          )}
        </div>
      </section>

      <section className="card px-2 pb-2">
        <h2 className="px-3 text-sm font-medium text-[var(--muted)]">Caffeine in body · 06:00 → 06:00</h2>
        <CaffeineChart data={data} from={from} to={to} now={now} bedtime={bedtime} />
      </section>

      <section className="card">
        <h2 className="mb-3 text-sm font-medium text-[var(--muted)]">Add a drink</h2>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={label(p)}
              onClick={() => onAdd(label(p), p.mg)}
              className="rounded-xl border border-[var(--grid)] px-3 py-2 text-left transition hover:border-[var(--accent)] active:scale-[0.98]"
            >
              <span className="block text-sm font-medium">{p.name}</span>
              <span className="num block text-xs text-[var(--muted)]">
                {p.size && `${p.size} · `}{p.mg} mg
              </span>
            </button>
          ))}
          <form
            onSubmit={addCustom}
            className={`flex rounded-xl border border-[var(--grid)] focus-within:border-[var(--accent)] ${PRESETS.length % 2 ? '' : 'col-span-2'}`}
          >
            <input
              inputMode="numeric"
              placeholder="Custom mg"
              value={customMg}
              onChange={(e) => setCustomMg(e.target.value.replace(/\D/g, ''))}
              className="num w-full min-w-0 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <button className="px-4 text-sm font-semibold text-[var(--accent)]">Add</button>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between text-sm">
          <h2 className="font-medium text-[var(--muted)]">Today</h2>
          <span className="num text-[var(--muted)]">{total} / {DAILY_LIMIT_MG} mg</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--grid)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${total > DAILY_LIMIT_MG ? 'bg-rose-500' : 'bg-[var(--accent)]'}`}
            style={{ width: `${Math.min(100, (total / DAILY_LIMIT_MG) * 100)}%` }}
          />
        </div>
        {today.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">Nothing logged yet. Tap a drink above.</p>
        ) : (
          <ul className="divide-y divide-[var(--grid)]">
            {today.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2 text-sm">
                <input
                  type="time"
                  value={clock(d.time)}
                  onChange={(e) => e.target.value && onRetime(d.id, atClock(e.target.value, from))}
                  className="num rounded-md bg-transparent px-1 py-0.5 text-[var(--muted)]"
                  aria-label={`Time of ${d.name}`}
                />
                <span className="flex-1">{d.name}</span>
                <span className="num text-[var(--muted)]">{d.mg} mg</span>
                <button
                  onClick={() => onRemove(d.id)}
                  className="grid size-7 place-items-center rounded-full text-[var(--muted)] transition hover:bg-rose-500/10 hover:text-rose-500"
                  aria-label={`Remove ${d.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {metabolism}
    </>
  )
}
