import { useEffect, useState } from 'react'

/** useState that survives a refresh via localStorage (silently in-memory if storage is blocked). */
/** `initial` may be a function, run only when nothing is stored yet. */
export function useStored<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = () => (typeof initial === 'function' ? (initial as () => T)() : initial)
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback()
    } catch {
      return fallback()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // private mode / storage full — keep working in memory
    }
  }, [key, value])

  return [value, setValue] as const
}
