import { useEffect, useState } from 'react'
import type { Watchable } from '../ports/watchable'
import { deviceAi, refreshDeviceAi } from '../app/container'

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

// whether this device answers on its own (no key). Asked once per screen; the container
// keeps the answer so the assistant can choose without waiting.
export function useDeviceAi() {
  const [state, setState] = useState(deviceAi())
  useEffect(() => {
    let live = true
    refreshDeviceAi().then(s => live && setState(s))
    return () => {
      live = false
    }
  }, [])
  return state
}
