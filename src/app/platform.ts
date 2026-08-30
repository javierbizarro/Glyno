// Where the app is running. Capacitor injects a global into the WebView; on the web there is
// none, so anything unrecognised is the web. Everything that behaves differently inside the
// app (install card, service worker, sharing, the visit ping) asks here.

export type Platform = 'web' | 'ios' | 'android'

export interface CapacitorGlobal {
  getPlatform?: () => string
}

/** pure so it can be tested: what the global says, or the web when it says nothing sane */
export function detectPlatform(cap?: CapacitorGlobal | null): Platform {
  const named = cap?.getPlatform?.()
  return named === 'ios' || named === 'android' ? named : 'web'
}

export const platform = (): Platform =>
  detectPlatform((globalThis as { Capacitor?: CapacitorGlobal }).Capacitor)

export const isNative = (): boolean => platform() !== 'web'
