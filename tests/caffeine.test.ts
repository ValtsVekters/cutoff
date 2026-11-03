import { test } from 'node:test'
import assert from 'node:assert/strict'
import { amountAt, budgetAt, cutoffTime, upcomingPeak, type Drink } from '../src/lib/caffeine.ts'
import { clock, dayKey, hourLabel, inputClock } from '../src/lib/time.ts'
import { sampleHistory } from '../src/lib/drinks.ts'

const H = 3_600_000
const coffee = (time: number): Drink => ({ id: 'c', name: 'Coffee', mg: 95, time })

test('nothing before the drink', () => {
  assert.equal(amountAt([coffee(10 * H)], 9 * H), 0)
})

test('peaks around 50 min, below the full dose', () => {
  const peak = amountAt([coffee(0)], (52 / 60) * H)
  assert.ok(peak > 80 && peak < 90, `peak ${peak}`)
  assert.ok(peak > amountAt([coffee(0)], (30 / 60) * H))
  assert.ok(peak > amountAt([coffee(0)], (90 / 60) * H))
})

test('roughly half left one half-life after the peak', () => {
  const later = amountAt([coffee(0)], 5 * H)
  assert.ok(later > 45 && later < 52, `5h ${later}`)
})

test('drinks stack', () => {
  const one = amountAt([coffee(0)], 6 * H)
  const two = amountAt([coffee(0), { ...coffee(0), id: 'd' }], 6 * H)
  assert.ok(Math.abs(two - 2 * one) < 1e-9)
})

test('cutoff for an empty day is well before bedtime', () => {
  const bed = 23 * H
  const cut = cutoffTime([], 6 * H, bed)
  assert.ok(cut !== null)
  assert.ok(bed - cut! > 4.5 * H && bed - cut! < 5.5 * H, `cutoff ${(bed - cut!) / H} h before bed`)
})

test('a drink just taken shows an upcoming peak ~50 min later', () => {
  const peak = upcomingPeak([coffee(0)], 0)
  assert.ok(peak !== null)
  const minutes = peak!.time / 60_000
  assert.ok(minutes > 45 && minutes < 60, `peak after ${minutes} min`)
  assert.ok(peak!.mg > 80 && peak!.mg < 90, `peak ${peak!.mg}`)
})

test('no upcoming peak once the level is falling', () => {
  assert.equal(upcomingPeak([coffee(0)], 3 * H), null)
})

test('budget taken now lands exactly on the limit at bedtime', () => {
  const day = [coffee(8 * H)]
  const b = budgetAt(day, 10 * H, 23 * H)
  const atBed = amountAt([...day, { ...coffee(10 * H), id: 'b', mg: b }], 23 * H)
  assert.ok(Math.abs(atBed - 50) < 1e-6, `bedtime ${atBed}`)
})

test('budget shrinks the later you drink', () => {
  assert.ok(budgetAt([], 10 * H, 23 * H) > budgetAt([], 16 * H, 23 * H))
})

test('no budget when already over the limit', () => {
  assert.equal(budgetAt([{ ...coffee(20 * H), mg: 400 }], 21 * H, 23 * H), 0)
})

test('times display as US AM/PM, inputs stay 24-hour', () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 3, h, m).getTime()
  assert.equal(clock(at(0, 5)), '12:05 AM')
  assert.equal(clock(at(12)), '12:00 PM')
  assert.equal(clock(at(16, 30)), '4:30 PM')
  assert.equal(hourLabel(at(18)), '6 PM')
  assert.equal(inputClock(at(16, 30)), '16:30')
})

test('sample history fills about two months before today, the same every time', () => {
  const from = new Date(2026, 10, 19, 6).getTime()
  const history = sampleHistory(from)
  assert.deepEqual(history, sampleHistory(from))
  assert.ok(history.every((d) => d.time < from && d.time >= from - 60 * 24 * H))
  const days = new Set(history.map((d) => dayKey(d.time)))
  assert.ok(days.size >= 45 && days.size <= 60, `${days.size} days`)
  const totals = [...days].map((k) => history.filter((d) => dayKey(d.time) === k).reduce((s, d) => s + d.mg, 0))
  assert.ok(totals.some((t) => t > 400), 'some days over 400 mg')
  assert.ok(totals.some((t) => t <= 200), 'some light days')
})

test('no cutoff when already over the limit', () => {
  const big: Drink = { id: 'e', name: 'Energy', mg: 400, time: 20 * H }
  assert.equal(cutoffTime([big], 21 * H, 23 * H), null)
})
