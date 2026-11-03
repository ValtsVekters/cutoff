import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MetabolismCard } from './components/MetabolismCard'
import type { Drink } from './lib/caffeine'
import { withDemo } from './lib/drinks'
import { DEFAULT_HALF_LIFE_H, SAMPLE_HEALTH, type HealthSource, type MetabolismMode } from './lib/health'
import { dayStart } from './lib/time'
import { useStored } from './lib/useStored'
import { CalendarView } from './views/CalendarView'
import { ScanView } from './views/ScanView'
import { TodayView } from './views/TodayView'

type Tab = 'today' | 'calendar' | 'scan'

const newId = () => Math.random().toString(36).slice(2, 10)

export default function App() {
  const [tab, setTab] = useStored<Tab>('cutoff.tab', 'today')
  // First-time visitors (e.g. from the pitch QR code) open straight into the demo.
  const [drinks, setDrinks] = useStored<Drink[]>('cutoff.drinks', () => withDemo([], dayStart(Date.now()), newId))
  const [bedClock, setBedClock] = useStored('cutoff.bedtime', '23:00')
  const [halfLife, setHalfLife] = useStored('cutoff.halfLife', DEFAULT_HALF_LIFE_H)
  const [mode, setMode] = useStored<MetabolismMode>('cutoff.metabolismMode', 'manual')
  const [health, setHealth] = useStored<HealthSource>('cutoff.health', 'none')
  const [now, setNow] = useState(() => Date.now())

  // Auto uses the half-life learned from sleep data; Normal until connected.
  const effectiveHalfLife = mode === 'manual' ? halfLife : health === 'sample' ? SAMPLE_HEALTH.halfLifeH : DEFAULT_HALF_LIFE_H

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [])

  // Move the clock with the new drink, or the model sees it as "not drunk yet".
  const add = (name: string, mg: number) => {
    const t = Date.now()
    setNow(t)
    setDrinks((ds) => [...ds, { id: newId(), name, mg, time: t }])
  }
  const remove = (id: string) => setDrinks((ds) => ds.filter((d) => d.id !== id))
  const retime = (id: string, time: number) => setDrinks((ds) => ds.map((d) => (d.id === id ? { ...d, time } : d)))

  const loadDemo = () => {
    setBedClock('23:00')
    setDrinks((ds) => withDemo(ds, dayStart(Date.now()), newId))
    setTab('today')
  }
  const clearToday = () => {
    const from = dayStart(Date.now())
    setDrinks((ds) => ds.filter((d) => d.time < from))
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 pt-6 pb-28">
      <header className="flex items-center">
        <button onClick={onLogoTap} className="flex items-center gap-2 select-none" aria-label="Cutoff">
          <span className="grid size-8 place-items-center rounded-xl bg-[var(--accent)] text-sm text-white">☾</span>
          <span className="text-xl font-semibold tracking-tight">Cutoff</span>
        </button>
      </header>

      {tab === 'today' && (
        <TodayView
          now={now}
          drinks={drinks}
          bedClock={bedClock}
          halfLife={effectiveHalfLife}
          metabolism={
            <MetabolismCard
              mode={mode}
              health={health}
              manualHalfLife={halfLife}
              onMode={setMode}
              onHealth={setHealth}
              onManualHalfLife={setHalfLife}
            />
          }
          onAdd={add}
          onRemove={remove}
          onRetime={retime}
          onBedClock={setBedClock}
        />
      )}
      {tab === 'calendar' && <CalendarView now={now} drinks={drinks} />}
      {tab === 'scan' && (
        <ScanView
          now={now}
          onAdd={(name, mg) => {
            add(name, mg)
            setTab('today')
          }}
          onLogManually={() => setTab('today')}
        />
      )}

      <footer className="mt-2 space-y-2 text-center text-xs text-[var(--muted)]">
        <p>Educational tool, not medical advice. The 50 mg bedtime line is a heuristic.</p>
        {tab === 'today' && (
          <p>
            <button onClick={loadDemo} className="underline-offset-2 hover:underline">Load demo day</button>
            {' · '}
            <button onClick={clearToday} className="underline-offset-2 hover:underline">Clear today</button>
          </p>
        )}
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--grid)] bg-[var(--card)]/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <TabButton active={tab === 'today'} onClick={() => setTab('today')} label="Today" icon={<path d="M3 17l5-6 4 3 4-7 5 6M3 21h18" />} />
          <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')} label="Calendar" icon={<><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>} />
          <TabButton active={tab === 'scan'} onClick={() => setTab('scan')} label="Scan" icon={<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></>} />
        </div>
      </nav>
    </div>
  )
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
      {label}
    </button>
  )
}
