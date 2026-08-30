import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'

// The static pages (privacy, evidence, who is behind, the landing) are extra HTML inputs, not
// routes of the app: whoever is deciding whether to trust Glyno must be able to read them
// without downloading React and three.js, and real files mean deep links need no router.
// `info/` and not `paginas/` because the folder name is part of the link people are given:
// the landing is `…/info/` (its index) and the rest hang off it.
const PAGINAS = ['index', 'privacidad', 'no-es-producto-sanitario', 'en-que-se-basa', 'quien-hay-detras']
const entry = (name: string) => fileURLToPath(new URL(`./info/${name}.html`, import.meta.url))

/**
 * vite-plugin-pwa injects the service-worker registration and the manifest into EVERY html
 * input. On these pages that would mean someone who only came to read the privacy policy
 * silently downloads the whole app and gets offered to install it — so they are stripped out.
 * It has to happen on the emitted asset: the plugin returns tags, and Vite appends those after
 * every transformIndexHtml has run, so a string replacement there would find nothing.
 */
const paginasSinPwa = (): Plugin => ({
  name: 'glyno-paginas-sin-pwa',
  enforce: 'post',
  generateBundle(_options, bundle) {
    for (const [file, output] of Object.entries(bundle)) {
      if (!file.startsWith('info/') || output.type !== 'asset') continue
      output.source = String(output.source)
        .replace(/\s*<link rel="manifest"[^>]*>/g, '')
        .replace(/\s*<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/g, '')
    }
  },
})

// NATIVE=1 builds the assets that Capacitor packs inside the app: served from the root of
// capacitor://localhost and with no service worker — the files are already local, and the SW
// only gets in the way of updating them.
const native = !!process.env.NATIVE

export default defineConfig({
  // on GitHub Pages the app lives at /Glyno/; locally and inside the native app, at the root
  base: native ? '/' : (process.env.DEPLOY_BASE ?? '/'),
  // build stamp: makes it possible to tell if the phone is serving a cached version.
  // Pinned to Madrid time because GitHub Actions builds in UTC, which is disorienting.
  define: {
    __VERSION__: JSON.stringify(version),
    __BUILD__: JSON.stringify(
      new Date().toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    ),
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        ...Object.fromEntries(PAGINAS.map(n => [n, entry(n)])),
      },
    },
  },
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['dexie', 'dexie-react-hooks'] },
  plugins: [
    react(),
    ...(native ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      workbox: {
        // downloadable files must escape the SPA fallback: without this, navigating
        // to them returns index.html and the "file" opens the app on Hoy
        navigateFallbackDenylist: [/\.shortcut$/, /\.mobileconfig$/, /\/info\//],
        // the pages are for whoever is evaluating Glyno, with a browser and a connection:
        // precaching them would weigh on every user's cache for something read once
        globIgnores: ['**/info/**'],
      },
      manifest: {
        name: 'Glyno — tu copiloto de diabetes',
        short_name: 'Glyno',
        description: 'Diario de glucemias con un compañero de IA. Tus datos de salud, en tu dispositivo.',
        lang: 'es',
        theme_color: '#F7F2E9',
        background_color: '#F7F2E9',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ]
      }
    })]),
    ...(native ? [] : [paginasSinPwa()]),
  ],
  server: { port: 5173, strictPort: true }
})
