export type Preset = { name: string; size?: string; mg: number }

// Approximate caffeine per serving.
export const PRESETS: Preset[] = [
  { name: 'Espresso', mg: 63 },
  { name: 'Coffee', size: '250 ml', mg: 95 },
  { name: 'Black tea', size: '250 ml', mg: 47 },
  { name: 'Green tea', size: '250 ml', mg: 28 },
  { name: 'Cola', size: '330 ml', mg: 34 },
  { name: 'Energy drink', size: '250 ml', mg: 80 },
  { name: 'Energy drink', size: '500 ml', mg: 160 },
]

export const label = (p: Preset) => (p.size ? `${p.name} ${p.size}` : p.name)

export const DEMO_DAY: { name: string; mg: number; at: string }[] = [
  { name: 'Coffee 250 ml', mg: 95, at: '08:00' },
  { name: 'Espresso', mg: 63, at: '11:30' },
  { name: 'Energy drink 500 ml', mg: 160, at: '16:00' },
  { name: 'Cola 330 ml', mg: 34, at: '19:00' },
]
