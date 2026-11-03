import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { lookupBarcode, type ScannedDrink } from '../lib/barcode'
import { clock } from '../lib/time'

type Props = { now: number; onAdd: (name: string, mg: number) => void; onLogManually: () => void }

type State =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'looking'; code: string }
  | { kind: 'found'; code: string; drink: ScannedDrink }
  | { kind: 'unknown'; code: string }
  | { kind: 'error'; message: string }

const SOURCE_NOTE: Record<ScannedDrink['source'], string> = {
  known: 'Verified can',
  label: 'From the product’s label data',
  brand: 'Estimated from the brand',
}

// Load the scanner only when it's needed, so the rest of the app stays light.
async function makeReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  const formats = [BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]
  return new BrowserMultiFormatReader(new Map([[DecodeHintType.POSSIBLE_FORMATS, formats]]))
}

export function ScanView({ now, onAdd, onLogManually }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const video = useRef<HTMLVideoElement>(null)
  const controls = useRef<IScannerControls | null>(null)

  const stopCamera = () => {
    controls.current?.stop()
    controls.current = null
  }
  useEffect(() => stopCamera, [])

  const handleCode = async (code: string) => {
    stopCamera()
    setState({ kind: 'looking', code })
    try {
      const drink = await lookupBarcode(code)
      setState(drink ? { kind: 'found', code, drink } : { kind: 'unknown', code })
    } catch {
      setState({ kind: 'error', message: 'Couldn’t look that barcode up. Check your connection and try again.' })
    }
  }

  const startCamera = async () => {
    setState({ kind: 'scanning' })
    try {
      const reader = await makeReader()
      controls.current = await reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        video.current!,
        (result) => {
          if (result) void handleCode(result.getText())
        },
      )
    } catch {
      stopCamera()
      setState({ kind: 'error', message: 'No camera access. Allow the camera, or take a photo of the barcode instead.' })
    }
  }

  const scanPhoto = async (file: File) => {
    stopCamera()
    setState({ kind: 'looking', code: '' })
    const url = URL.createObjectURL(file)
    try {
      const reader = await makeReader()
      const result = await reader.decodeFromImageUrl(url)
      await handleCode(result.getText())
    } catch {
      setState({ kind: 'error', message: 'No barcode found in that photo. Get closer and keep the barcode flat and sharp.' })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return (
    <>
      <section className="card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Scan a drink</h2>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            Preview · barcodes only
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">Point your camera at the barcode on a can.</p>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border-2 border-dashed border-[var(--grid)] bg-black/5">
          <video
            ref={video}
            muted
            playsInline
            className={`size-full object-cover ${state.kind === 'scanning' ? '' : 'hidden'}`}
          />
          {state.kind === 'scanning' ? (
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-[var(--accent)] shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
          ) : (
            <button
              onClick={startCamera}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition hover:bg-[var(--accent)]/5"
            >
              <svg viewBox="0 0 24 24" className="size-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 9v6M10 9v6M13 9v6M17 9v6" />
              </svg>
              <span className="text-sm font-medium">{state.kind === 'idle' ? 'Start camera' : 'Scan again'}</span>
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          {state.kind === 'scanning' ? (
            <button onClick={() => { stopCamera(); setState({ kind: 'idle' }) }} className="font-medium text-[var(--muted)]">
              Stop camera
            </button>
          ) : (
            <span />
          )}
          <label className="cursor-pointer font-medium text-[var(--accent)]">
            Or take a photo of the barcode
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void scanPhoto(file)
              }}
            />
          </label>
        </div>
      </section>

      {state.kind === 'looking' && (
        <section className="card text-sm text-[var(--muted)]">Looking up {state.code ? `barcode ${state.code}` : 'your photo'}…</section>
      )}

      {state.kind === 'found' && (
        <section className="card">
          <p className="text-sm text-[var(--muted)]">{SOURCE_NOTE[state.drink.source]} · {state.code}</p>
          <p className="mt-1 text-lg font-semibold">{state.drink.name}</p>
          <p className="num mt-1 text-4xl font-semibold">{state.drink.mg} mg</p>
          <button
            onClick={() => onAdd(state.drink.name, state.drink.mg)}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 font-semibold text-white transition active:scale-[0.98]"
          >
            Add at {clock(now)}
          </button>
        </section>
      )}

      {state.kind === 'unknown' && (
        <section className="card text-sm">
          <p className="font-medium">We don’t know barcode {state.code} yet.</p>
          <button onClick={onLogManually} className="mt-3 font-semibold text-[var(--accent)]">Log it manually →</button>
        </section>
      )}

      {state.kind === 'error' && (
        <section className="card text-sm">
          <p>{state.message}</p>
          <button onClick={onLogManually} className="mt-3 font-semibold text-[var(--accent)]">Log it manually →</button>
        </section>
      )}

      <section className="card bg-[var(--accent)]/10 text-sm">
        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
          Coming later
        </span>
        <p className="mt-3 leading-relaxed">
          Photo recognition: Cutoff will recognise any drink from a photo, even a coffee cup with no barcode.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">Tested with Bloom Crisp Apple and Coca-Cola Zero Sugar (US cans).</p>
      </section>
    </>
  )
}
