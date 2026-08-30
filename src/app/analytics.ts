// Anonymous visit counting (GoatCounter): one ping per app open, nothing else.
// Deliberately NOT their <script>: the project bundles everything, so the ping is
// a bare request we own. No cookies, no identifiers, and never any health data.

import { isNative } from './platform'

const SITE = 'https://glyno.goatcounter.com/count'

export interface VisitEnv {
  hostname: string
  /** navigator.doNotTrack — '1' in most browsers, 'yes' in some older ones */
  dnt: string | null
  /** navigator.globalPrivacyControl */
  gpc: boolean
  /** import.meta.env.DEV — the dev server binds 0.0.0.0, so hostname alone can't spot it */
  dev: boolean
  /** inside the app there is no ping at all: the stores already count opens, aggregated */
  native: boolean
}

// bare IPv4 or bracketed IPv6: a LAN address is never a real deployment
const IP_HOST = /^(\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:]+\])$/i

/**
 * Never inside the native app, never on dev builds or dev-looking hosts, never against an
 * opt-out signal (DNT / GPC). The native exception is a promise, not a technicality: the app
 * declares "no data collected", and it has to be true.
 */
export function shouldCountVisit(env: VisitEnv): boolean {
  if (env.native) return false
  if (env.dnt === '1' || env.dnt === 'yes' || env.gpc) return false
  if (env.dev) return false
  if (env.hostname === 'localhost' || env.hostname.endsWith('.local') || IP_HOST.test(env.hostname))
    return false
  return true
}

/** the entire payload: app path, a title and a cache buster — audit it here */
export function pingUrl(now: number): string {
  return `${SITE}?p=${encodeURIComponent('/app')}&t=Glyno&rnd=${now}`
}

export function countVisit(): void {
  // analytics must never be able to break the app boot
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
    const env: VisitEnv = {
      hostname: location.hostname,
      // legacy browsers exposed the signal on window instead of navigator
      dnt: nav.doNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack ?? null,
      gpc: nav.globalPrivacyControl === true,
      dev: import.meta.env.DEV,
      native: isNative(),
    }
    if (!shouldCountVisit(env)) return
    // an Image request needs no CORS, never blocks the app and fails silently offline
    new Image().src = pingUrl(Date.now())
  } catch {
    /* counting is never worth an error */
  }
}
