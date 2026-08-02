import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // en GitHub Pages la app vive en /Glyno/; en local, en la raíz
  base: process.env.DEPLOY_BASE ?? '/',
  // sello de compilación: permite saber si el móvil está sirviendo una versión cacheada
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['dexie', 'dexie-react-hooks'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Glyno — tu copiloto de diabetes',
        short_name: 'Glyno',
        description: 'Diario de glucemias con un compañero de IA. Tus datos no salen de tu dispositivo.',
        lang: 'es',
        theme_color: '#F7F2E9',
        background_color: '#F7F2E9',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ]
      }
    })
  ],
  server: { port: 5173, strictPort: true }
})
