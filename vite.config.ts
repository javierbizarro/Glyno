import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'

export default defineConfig({
  // on GitHub Pages the app lives at /Glyno/; locally, at the root
  base: process.env.DEPLOY_BASE ?? '/',
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
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['dexie', 'dexie-react-hooks'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      workbox: {
        // downloadable files must escape the SPA fallback: without this, navigating
        // to them returns index.html and the "file" opens the app on Hoy
        navigateFallbackDenylist: [/\.shortcut$/, /\.mobileconfig$/],
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
    })
  ],
  server: { port: 5173, strictPort: true }
})
