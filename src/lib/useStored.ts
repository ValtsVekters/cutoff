import { useEffect, useState } from 'react'

/** useState that survives a refresh via localStorage (silently in-memory if storage is blocked). */
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
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
