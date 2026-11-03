import { useEffect, useState } from 'react'

type Props = { onLogManually: () => void }

export function ScanView({ onLogManually }: Props) {
  // The photo stays in the browser as an object URL; nothing is uploaded.
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo)
  }, [photo])

  return (
    <>
      <section className="card">
        <h2 className="text-lg font-semibold">Scan a drink</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Take a photo of a can, bottle or cup.</p>

        <label className="mt-4 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-[var(--grid)] transition hover:border-[var(--accent)]">
          {photo ? (
            <img src={photo} alt="Your drink" className="size-full object-cover" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="size-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.4-2h7l1.4 2h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="text-sm font-medium">Tap to take a photo</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setPhoto(URL.createObjectURL(file))
            }}
          />
        </label>
      </section>

      <section className="card bg-[var(--accent)]/10">
        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
          Coming soon
        </span>
        <p className="mt-3 text-sm leading-relaxed">
          {photo
            ? 'Got it! Soon Cutoff will recognise this drink and tell you how much caffeine is in it, then add it to your day with one tap.'
            : 'Soon Cutoff will recognise the drink in your photo and tell you how much caffeine is in it, then add it to your day with one tap.'}
        </p>
        <button onClick={onLogManually} className="mt-4 text-sm font-semibold text-[var(--accent)]">
          Log it manually for now →
        </button>
      </section>
    </>
  )
}
