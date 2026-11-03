import { useState } from 'react'
import { SAMPLE_HEALTH, type HealthSource, type MetabolismMode } from '../lib/health'

const SPEED: Record<number, string> = { 3: 'Fast', 4: 'Fast', 5: 'Normal', 6: 'Slow', 7: 'Slow' }

type Props = {
  mode: MetabolismMode
  health: HealthSource
  manualHalfLife: number
  onMode: (m: MetabolismMode) => void
  onHealth: (h: HealthSource) => void
  onManualHalfLife: (h: number) => void
}

export function MetabolismCard({ mode, health, manualHalfLife, onMode, onHealth, onManualHalfLife }: Props) {
  const [askedToConnect, setAskedToConnect] = useState(false)

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between text-sm">
        <h2 className="font-medium text-[var(--muted)]">Your metabolism</h2>
        <div className="flex rounded-full bg-[var(--grid)] p-0.5 text-xs font-medium" role="tablist">
          {(['manual', 'auto'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => onMode(m)}
              className={`rounded-full px-3 py-1 capitalize transition ${
                mode === m ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'manual' && (
        <>
          <div className="mb-1 text-right text-sm">
            <span className="num font-medium">{SPEED[manualHalfLife]} · {manualHalfLife} h half-life</span>
          </div>
          <input
            type="range"
            min={3}
            max={7}
            step={1}
            value={manualHalfLife}
            onChange={(e) => onManualHalfLife(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
            aria-label="Caffeine half-life in hours"
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
            <span>Fast</span>
            <span>Normal</span>
            <span>Slow</span>
          </div>
        </>
      )}

      {mode === 'auto' && health === 'sample' && (
        <div className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="num text-lg font-semibold">
              {SPEED[SAMPLE_HEALTH.halfLifeH]} · {SAMPLE_HEALTH.halfLifeH} h half-life
            </span>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Sample data
            </span>
          </div>
          <p className="text-[var(--muted)]">
            Learned from {SAMPLE_HEALTH.nights} nights of sleep. {SAMPLE_HEALTH.finding}
          </p>
          <button onClick={() => onHealth('none')} className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]">
            Disconnect
          </button>
        </div>
      )}

      {mode === 'auto' && health === 'none' && (
        <div className="space-y-3 text-sm">
          <p className="text-[var(--muted)]">
            Cutoff reads your sleep from Apple Health and learns how fast your body clears caffeine, so you don't have to guess.
          </p>
          <button
            onClick={() => setAskedToConnect(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-2.5 font-medium text-[var(--card)] transition active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="size-4 text-rose-500" fill="currentColor" aria-hidden="true">
              <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.2C19.5 16.4 12 21 12 21z" />
            </svg>
            Connect Apple Health
          </button>
          {askedToConnect && (
            <div className="rounded-xl bg-[var(--accent)]/10 p-3">
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
                Coming soon
              </span>
              <p className="mt-2">Apple Health connects through the Cutoff iPhone app. Until then, see how Auto works:</p>
              <button onClick={() => onHealth('sample')} className="mt-2 font-semibold text-[var(--accent)]">
                Try with sample sleep data →
              </button>
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">Using Normal (5 h) until connected.</p>
        </div>
      )}
    </section>
  )
}
