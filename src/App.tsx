import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CaffeineChart } from './components/CaffeineChart'
import { amountAt, curve, cutoffTime, DAILY_LIMIT_MG, SAFE_MG, WARN_MG, type Drink } from './lib/caffeine'
import { DEMO_DAY, label, PRESETS } from './lib/drinks'
import { atClock, clock, dayStart } from './lib/time'
import { useStored } from './lib/useStored'

const DAY = 24 * 3_600_000

const STATUS = {
  good: { box: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100', dot: 'bg-emerald-500', label: 'Sleep-safe' },
  warn: { box: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100', dot: 'bg-amber-500', label: 'Might delay sleep' },
  bad: { box: 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100', dot: 'bg-rose-500', label: 'Likely to hurt sleep' },
}

const METABOLISM: Record<number, string> = { 3: 'Fast', 4: 'Fast', 5: 'Normal', 6: 'Slow', 7: 'Slow' }

const newId = () => Math.random().toString(36).slice(2, 10)

export default function App() {
  const [drinks, setDrinks] = useStored<Drink[]>('cutoff.drinks', [])
  const [bedClock, setBedClock] = useStored('cutoff.bedtime', '23:00')
  const [halfLife, setHalfLife] = useStored('cutoff.halfLife', 5)
  const [customMg, setCustomMg] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const from = dayStart(now)
  const to = from + DAY
  const bedtime = atClock(bedClock, from)

  // Yesterday's late drinks still count toward today's curve.
  const relevant = drinks.filter((d) => d.time >= from - DAY)
  const today = relevant.filter((d) => d.time >= from).sort((a, b) => a.time - b.time)

  const data = curve(relevant, from, to, halfLife)
  const atBed = amountAt(relevant, bedtime, halfLife)
  const inBody = amountAt(relevant, now, halfLife)
  const cutoff = now < bedtime ? cutoffTime(relevant, now, bedtime, halfLife) : null
  const total = today.reduce((s, d) => s + d.mg, 0)
  const status = atBed < SAFE_MG ? STATUS.good : atBed <= WARN_MG ? STATUS.warn : STATUS.bad

  const add = (name: string, mg: number) => setDrinks((ds) => [...ds, { id: newId(), name, mg, time: Date.now() }])
  const remove = (id: string) => setDrinks((ds) => ds.filter((d) => d.id !== id))
  const retime = (id: string, hhmm: string) => {
    if (hhmm) setDrinks((ds) => ds.map((d) => (d.id === id ? { ...d, time: atClock(hhmm, from) } : d)))
  }

  const addCustom = (e: FormEvent) => {
    e.preventDefault()
    const mg = Math.round(Number(customMg))
    if (mg > 0 && mg <= 1000) {
      add('Custom', mg)
      setCustomMg('')
    }
  }

  const loadDemo = () => {
    setBedClock('23:00')
    setDrinks(DEMO_DAY.map((d) => ({ id: newId(), name: d.name, mg: d.mg, time: atClock(d.at, from) })))
  }

  // Triple-tap the logo to load the demo day.
  const taps = useRef<number[]>([])
  const onLogoTap = () => {
    const t = Date.now()
    taps.current = [...taps.current.filter((x) => t - x < 600), t]
    if (taps.current.length >= 3) {
      taps.current = []
      loadDemo()
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 pt-6 pb-10">
      <header className="flex items-center justify-between">
        <button onClick={onLogoTap} className="flex items-center gap-2 select-none" aria-label="Cutoff">
          <span className="grid size-8 place-items-center rounded-xl bg-[var(--accent)] text-sm text-white">☾</span>
          <span className="text-xl font-semibold tracking-tight">Cutoff</span>
        </button>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          Bedtime
          <input
            type="time"
            value={bedClock}
            onChange={(e) => e.target.value && setBedClock(e.target.value)}
            className="num rounded-lg bg-[var(--card)] px-2 py-1 font-medium text-[var(--ink)] shadow-sm"
          />
        </label>
      </header>

      <section className={`card transition-colors duration-500 ${status.box}`}>
        <div className="flex items-center gap-2 text-sm font-medium opacity-80">
          <span className={`size-2 rounded-full ${status.dot}`} />
          {status.label}
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
              onClick={() => add(label(p), p.mg)}
              className="rounded-xl border border-[var(--grid)] px-3 py-2 text-left transition hover:border-[var(--accent)] active:scale-[0.98]"
            >
              <span className="block text-sm font-medium">{p.name}</span>
              <span className="num block text-xs text-[var(--muted)]">
                {p.size && `${p.size} · `}{p.mg} mg
              </span>
            </button>
          ))}
          <form onSubmit={addCustom} className="flex rounded-xl border border-[var(--grid)] focus-within:border-[var(--accent)]">
            <input
              inputMode="numeric"
              placeholder="Custom mg"
              value={customMg}
              onChange={(e) => setCustomMg(e.target.value.replace(/\D/g, ''))}
              className="num w-full min-w-0 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <button className="px-3 text-sm font-semibold text-[var(--accent)]" aria-label="Add custom drink">+</button>
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
                  onChange={(e) => retime(d.id, e.target.value)}
                  className="num rounded-md bg-transparent px-1 py-0.5 text-[var(--muted)]"
                  aria-label={`Time of ${d.name}`}
                />
                <span className="flex-1">{d.name}</span>
                <span className="num text-[var(--muted)]">{d.mg} mg</span>
                <button
                  onClick={() => remove(d.id)}
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
          onChange={(e) => setHalfLife(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
          aria-label="Caffeine half-life in hours"
        />
        <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
          <span>Fast</span>
          <span>Normal</span>
          <span>Slow</span>
        </div>
      </section>

      <footer className="mt-2 space-y-2 text-center text-xs text-[var(--muted)]">
        <p>Educational tool, not medical advice. The 50 mg bedtime line is a heuristic.</p>
        <p>
          <button onClick={loadDemo} className="underline-offset-2 hover:underline">Load demo day</button>
          {' · '}
          <button onClick={() => setDrinks([])} className="underline-offset-2 hover:underline">Clear</button>
        </p>
      </footer>
    </div>
  )
}
