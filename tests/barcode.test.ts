import { test } from 'node:test'
import assert from 'node:assert/strict'
import { caffeineFromProduct, KNOWN_CANS, lookupBarcode, normalizeCode, parseVolumeMl } from '../src/lib/barcode.ts'

// GTIN check digit: weights 3,1,3,… from the right, excluding the check digit.
function validGtin(code: string): boolean {
  const digits = code.padStart(14, '0').split('').map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

test('built-in cans have valid barcodes (catches typos)', () => {
  for (const code of Object.keys(KNOWN_CANS)) assert.ok(validGtin(code), code)
})

test('UPC-A and EAN-13 forms of the same can match', () => {
  assert.equal(normalizeCode('842595138214'), normalizeCode('0842595138214'))
  assert.equal(normalizeCode('049000042566'), normalizeCode('0049000042566'))
})

test('Bloom Crisp Apple and Coke Zero work without the network', async () => {
  const offline = (() => {
    throw new Error('no network')
  }) as unknown as typeof fetch
  assert.deepEqual(await lookupBarcode('0842595138214', offline), { name: 'Bloom Crisp Apple 12 fl oz', mg: 180, source: 'known' })
  assert.deepEqual(await lookupBarcode('049000042566', offline), { name: 'Coca-Cola Zero Sugar 12 fl oz', mg: 34, source: 'known' })
})

test('volumes parse from common label formats', () => {
  assert.equal(parseVolumeMl('355 ml'), 355)
  assert.equal(parseVolumeMl('250ml'), 250)
  assert.equal(parseVolumeMl('25 cl'), 250)
  assert.equal(parseVolumeMl('1 L'), 1000)
  assert.equal(parseVolumeMl('12 fl oz'), 355)
  assert.equal(parseVolumeMl('24 x 12 oz'), 355)
  assert.equal(parseVolumeMl('?'), null)
})

test('caffeine comes from the label data when present', () => {
  const monster = caffeineFromProduct({ product_name: 'Monster Energy', quantity: '500 ml', nutriments: { caffeine_100g: 0.032 } })
  assert.deepEqual(monster, { name: 'Monster Energy', mg: 160, source: 'label' })
})

test('brand rules fill in when the label data is missing', () => {
  assert.equal(caffeineFromProduct({ brands: 'Coca-Cola', product_name: 'Coke Zero', quantity: '12 fl oz' })?.mg, 34)
  assert.equal(caffeineFromProduct({ brands: 'Red Bull', product_name: 'Red Bull', quantity: '250 ml' })?.mg, 80)
  assert.equal(caffeineFromProduct({ brands: 'Coca-Cola', product_name: 'Coca-Cola Zero Caffeine Free' })?.mg, 0)
  assert.equal(caffeineFromProduct({ brands: 'Tropicana', product_name: 'Orange juice' }), null)
})

test('unknown barcodes are looked up in Open Food Facts', async () => {
  const seen: string[] = []
  const fakeFetch = (async (url: string) => {
    seen.push(url)
    return new Response(JSON.stringify({ status: 1, product: { brands: 'Red Bull', product_name: 'Red Bull', quantity: '250 ml', nutriments: { caffeine_100g: 0.032 } } }))
  }) as unknown as typeof fetch
  const drink = await lookupBarcode('90162602', fakeFetch)
  assert.deepEqual(drink, { name: 'Red Bull · Red Bull', mg: 80, source: 'label' })
  assert.match(seen[0], /openfoodfacts\.org\/api\/v2\/product\/0000090162602\.json/)
})
