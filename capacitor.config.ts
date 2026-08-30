import type { CapacitorConfig } from '@capacitor/cli'

// The native shell. `webDir` is what `make native` builds: root paths and no service worker.
const config: CapacitorConfig = {
  appId: 'app.glyno',
  appName: 'Glyno',
  webDir: 'dist',
  // warm paper behind the WebView, so nothing white flashes on launch or when overscrolling
  backgroundColor: '#F7F2E9',
  ios: {
    // the app draws its own safe areas with env(safe-area-inset-*), as it already did as a PWA
    contentInset: 'never',
    backgroundColor: '#F7F2E9',
  },
}

export default config
