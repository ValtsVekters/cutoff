import { test } from 'node:test'
import assert from 'node:assert/strict'
import { amountAt, cutoffTime, type Drink } from '../src/lib/caffeine.ts'

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

test('no cutoff when already over the limit', () => {
  const big: Drink = { id: 'e', name: 'Energy', mg: 400, time: 20 * H }
  assert.equal(cutoffTime([big], 21 * H, 23 * H), null)
})
