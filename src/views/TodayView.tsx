import { useState, type FormEvent } from 'react'
import { CaffeineChart } from '../components/CaffeineChart'
import { amountAt, curve, cutoffTime, DAILY_LIMIT_MG, SAFE_MG, WARN_MG, type Drink } from '../lib/caffeine'
import { label, PRESETS } from '../lib/drinks'
import { atClock, clock, dayStart } from '../lib/time'

const DAY = 24 * 3_600_000

const STATUS = {
  good: { box: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100', dot: 'bg-emerald-500', label: 'Sleep-safe' },
  warn: { box: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100', dot: 'bg-amber-500', label: 'Might delay sleep' },
  bad: { box: 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100', dot: 'bg-rose-500', label: 'Likely to hurt sleep' },
}

const METABOLISM: Record<number, string> = { 3: 'Fast', 4: 'Fast', 5: 'Normal', 6: 'Slow', 7: 'Slow' }

type Props = {
  now: number
  drinks: Drink[]
  bedClock: string
  halfLife: number
  onAdd: (name: string, mg: number) => void
  onRemove: (id: string) => void
  onRetime: (id: string, time: number) => void
  onBedClock: (hhmm: string) => void
  onHalfLife: (h: number) => void
}

export function TodayView({ now, drinks, bedClock, halfLife, onAdd, onRemove, onRetime, onBedClock, onHalfLife }: Props) {
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
  const cutoff = now < bedtime ? cutoffTime(relevant, now, bedtime, halfLife) : null
  const total = today.reduce((s, d) => s + d.mg, 0)
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
        <div className="mt-4 flex items-center justify-between border-t border-current/10 pt-3 text-sm">
          <span className="opacity-70">In your body now: <b className="num">{Math.round(inBody)} mg</b></span>
          <span className="font-medium">
            {cutoff ? <>Last safe coffee <b className="num">{clock(cutoff)}</b></> : 'No more caffeine today'}
          </span>
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

      <section className="card">
        <div className="mb-2 flex items-center justify-between text-sm">
          <h2 className="font-medium text-[var(--muted)]">Your metabolism</h2>
          <span className="num font-medium">{METABOLISM[halfLife]} · {halfLife} h half-life</span>
        </div>
        <input
          type="range"
          min={3}
          max={7}
          step={1}
          value={halfLife}
          onChange={(e) => onHalfLife(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
          aria-label="Caffeine half-life in hours"
        />
        <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
          <span>Fast</span>
          <span>Normal</span>
          <span>Slow</span>
        </div>
      </section>
    </>
  )
}
