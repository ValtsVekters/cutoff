// One-compartment pharmacokinetic model with first-order absorption.
// A(t) = D · ka / (ka − ke) · (e^(−ke·Δt) − e^(−ka·Δt))

export type Drink = {
  id: string
  name: string
  mg: number
  time: number // ms timestamp
}

export type Point = { time: number; mg: number }

const HOUR = 3_600_000
const MIN = 60_000

export const SAFE_MG = 50
export const WARN_MG = 100
export const DAILY_LIMIT_MG = 400

/** Caffeine (mg) still in the body at time t from all drinks taken at or before t. */
export function amountAt(drinks: Drink[], t: number, halfLifeH = 5, ka = 4): number {
  const ke = Math.LN2 / halfLifeH
  let total = 0
  for (const d of drinks) {
    const dt = (t - d.time) / HOUR
    if (dt < 0) continue
    total += ((d.mg * ka) / (ka - ke)) * (Math.exp(-ke * dt) - Math.exp(-ka * dt))
  }
  return total
}

export function curve(
  drinks: Drink[],
  from: number,
  to: number,
  halfLifeH = 5,
  stepMin = 10,
): Point[] {
  const points: Point[] = []
  for (let t = from; t <= to; t += stepMin * MIN) {
    points.push({ time: t, mg: amountAt(drinks, t, halfLifeH) })
  }
  return points
}

/**
 * Highest level within the next `horizonMin` minutes, so the UI can say
 * "still absorbing, peaks at X mg". Returns null if the level only falls.
 */
export function upcomingPeak(drinks: Drink[], now: number, halfLifeH = 5, horizonMin = 180): Point | null {
  const current = amountAt(drinks, now, halfLifeH)
  let peak: Point = { time: now, mg: current }
  for (let t = now + MIN; t <= now + horizonMin * MIN; t += MIN) {
    const mg = amountAt(drinks, t, halfLifeH)
    if (mg > peak.mg) peak = { time: t, mg }
  }
  return peak.mg - current >= 1 ? peak : null
}

/** Smallest drink worth suggesting (about a cola). */
export const MIN_DRINK_MG = 30

/**
 * Most caffeine (mg) you could take at time t and still be under `limitMg`
 * at bedtime. The model is linear in dose, so it's the remaining room
 * divided by what 1 mg taken at t leaves at bedtime.
 */
export function budgetAt(drinks: Drink[], t: number, bedtime: number, halfLifeH = 5, limitMg = SAFE_MG): number {
  if (t >= bedtime) return 0
  const room = limitMg - amountAt(drinks, bedtime, halfLifeH)
  const perMg = amountAt([{ id: 'unit', name: 'unit', mg: 1, time: t }], bedtime, halfLifeH)
  return room > 0 ? room / perMg : 0
}

/**
 * Latest time between `now` and `bedtime` (5-min steps) at which one more
 * `testMg` drink still keeps the bedtime level under `limitMg`. null = none.
 */
export function cutoffTime(
  drinks: Drink[],
  now: number,
  bedtime: number,
  halfLifeH = 5,
  testMg = 95,
  limitMg = SAFE_MG,
): number | null {
  const step = 5 * MIN
  const start = Math.ceil(now / step) * step
  let best: number | null = null
  for (let t = start; t <= bedtime; t += step) {
    const test: Drink = { id: 'test', name: 'test', mg: testMg, time: t }
    if (amountAt([...drinks, test], bedtime, halfLifeH) < limitMg) best = t
    else break // later drinks only leave more at bedtime
  }
  return best
}
