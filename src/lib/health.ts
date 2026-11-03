export type MetabolismMode = 'manual' | 'auto'
export type HealthSource = 'none' | 'sample'

// What "Auto" would learn from Apple Health sleep data. A website can't read
// HealthKit, so the prototype offers clearly-labelled sample data instead.
export const SAMPLE_HEALTH = {
  halfLifeH: 6,
  nights: 14,
  finding: 'On days with caffeine after 15:00 you fell asleep 34 min later.',
}

export const DEFAULT_HALF_LIFE_H = 5
