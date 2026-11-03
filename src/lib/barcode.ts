// Barcode → caffeine. Cans we've verified are built in; anything else is
// looked up in Open Food Facts (free, no key) and estimated by brand when
// the database has no caffeine value.

export type ScannedDrink = {
  name: string
  mg: number
  /** known = built-in can, label = caffeine from the product data, brand = estimated from the brand */
  source: 'known' | 'label' | 'brand'
}

type Product = {
  product_name?: string
  brands?: string
  quantity?: string
  nutriments?: { caffeine_100g?: number }
}

/** Digits only, leading zeros dropped, so UPC-A "0123…" and EAN-13 "00123…" match. */
export const normalizeCode = (code: string) => code.replace(/\D/g, '').replace(/^0+/, '')

// Verified US cans (UPC from retailer listings and Open Food Facts).
export const KNOWN_CANS: Record<string, { name: string; mg: number }> = {
  [normalizeCode('842595138214')]: { name: 'Bloom Crisp Apple 12 fl oz', mg: 180 },
  [normalizeCode('049000042566')]: { name: 'Coca-Cola Zero Sugar 12 fl oz', mg: 34 },
}

// mg caffeine per 100 ml, first match wins. Used when the database lacks a value.
const BRAND_RULES: [RegExp, number][] = [
  [/caffeine[ -]?free/i, 0],
  [/bloom/i, 50.7],
  [/red ?bull/i, 32],
  [/monster/i, 32],
  [/diet coke/i, 12.7],
  [/coke|coca[ -]?cola/i, 9.6],
]

const US_CAN_ML = 355

/** "355 ml", "25 cl", "1 L", "12 fl oz", "24 x 12 oz" → millilitres of one unit, or null. */
export function parseVolumeMl(quantity: string | undefined): number | null {
  const m = quantity?.match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|l|fl\.?\s*oz|oz)\b/i)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  const unit = m[2].toLowerCase().replace(/[\s.]/g, '')
  const ml = unit === 'ml' ? n : unit === 'cl' ? n * 10 : unit === 'l' ? n * 1000 : n * 29.5735
  return Math.round(ml)
}

export function caffeineFromProduct(p: Product): ScannedDrink | null {
  const name = [p.brands?.split(',')[0], p.product_name].filter(Boolean).join(' · ') || 'Scanned drink'
  const ml = parseVolumeMl(p.quantity) ?? US_CAN_ML
  const perLabel = p.nutriments?.caffeine_100g
  if (typeof perLabel === 'number' && perLabel > 0) {
    // Open Food Facts stores caffeine in grams per 100 g (≈ 100 ml for drinks).
    return { name, mg: Math.round((perLabel * 1000 * ml) / 100), source: 'label' }
  }
  const text = `${p.brands ?? ''} ${p.product_name ?? ''}`
  const rule = BRAND_RULES.find(([re]) => re.test(text))
  return rule ? { name, mg: Math.round((rule[1] * ml) / 100), source: 'brand' } : null
}

export async function lookupBarcode(code: string, fetchFn: typeof fetch = fetch): Promise<ScannedDrink | null> {
  const n = normalizeCode(code)
  const known = KNOWN_CANS[n]
  if (known) return { ...known, source: 'known' }

  const candidates = [...new Set([n.padStart(13, '0'), n.padStart(12, '0'), n])]
  for (const c of candidates) {
    const res = await fetchFn(
      `https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=product_name,brands,quantity,nutriments`,
    )
    if (!res.ok) continue
    const data = (await res.json()) as { status?: number; product?: Product }
    if (data.status === 1 && data.product) return caffeineFromProduct(data.product)
  }
  return null
}
