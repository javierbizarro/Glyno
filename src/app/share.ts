// Passing Glyno on to someone else. Inside the app there is no address bar to copy from —
// `location` says capacitor://localhost, a link that opens nothing — so the native build
// shares a fixed public address instead of wherever the code happens to be running.
import { isNative, platform, type Platform } from './platform'

/** where someone who receives the link actually lands */
export const WEB_URL = 'https://glyno.es/'

export const SHARE_TEXT =
  'Glyno, un copiloto para el día a día con diabetes: apunta tus glucemias, te busca patrones y prepara el informe para el médico. Gratis y sin cuentas.'

/** on the web, the address in use (dev, Pages, a copy of your own); in the app, the fixed one */
export function shareUrl(where: Platform, origin: string, base: string): string {
  return where === 'web' ? origin + base : WEB_URL
}

export const appUrl = (): string => shareUrl(platform(), location.origin, import.meta.env.BASE_URL)

export type ShareOutcome = 'shared' | 'copied' | 'failed'

/**
 * The share sheet if there is one, the clipboard if not. `navigator.share` is not dependable
 * inside a WebView, so the app goes through Capacitor's plugin — loaded on demand so the web
 * bundle never carries it.
 */
export async function shareApp(): Promise<ShareOutcome> {
  const url = appUrl()
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: 'Glyno', text: SHARE_TEXT, url })
      return 'shared'
    } catch {
      // the user dismissing the sheet lands here too: the clipboard is a harmless consolation
      return copy(url)
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Glyno', text: SHARE_TEXT, url })
      return 'shared'
    } catch {
      return 'shared' /* cancelled: nothing to tell them */
    }
  }
  return copy(url)
}

async function copy(url: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(`${SHARE_TEXT}\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
