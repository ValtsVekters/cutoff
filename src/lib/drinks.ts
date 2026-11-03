export type Preset = { name: string; size?: string; mg: number }

// Caffeine per serving, from can labels (Bloom: US can; Canadian cans list 140 mg).
export const PRESETS: Preset[] = [
  { name: 'Cola', size: '330 ml', mg: 34 },
  { name: 'Bloom', size: '355 ml', mg: 180 },
  { name: 'Red Bull', size: '250 ml', mg: 80 },
  { name: 'Monster', size: '500 ml', mg: 160 },
  { name: 'Coffee', size: '250 ml', mg: 95 },
  { name: 'Espresso', mg: 63 },
  { name: 'Green tea', size: '250 ml', mg: 28 },
]

export const label = (p: Preset) => (p.size ? `${p.name} ${p.size}` : p.name)

export const DEMO_DAY: { name: string; mg: number; at: string }[] = [
  { name: 'Coffee 250 ml', mg: 95, at: '08:00' },
  { name: 'Espresso', mg: 63, at: '11:30' },
  { name: 'Monster 500 ml', mg: 160, at: '16:00' },
  { name: 'Cola 330 ml', mg: 34, at: '19:00' },
]
