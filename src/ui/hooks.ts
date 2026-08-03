import { useEffect, useState } from 'react'
import type { Watchable } from '../ports/watchable'

// generic bridge between any Watchable (port) and React
export function useWatch<T>(make: () => Watchable<T>, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    const sub = make().subscribe(setValue)
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}
