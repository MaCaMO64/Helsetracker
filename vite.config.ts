import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg'],
      // Hold pdf.js (lib + worker, ~1,7 MB til sammen) UTE av precachen – det
      // hentes ved behov når man åpner Prøver. App-skallet precaches som før.
      injectManifest: {
        globIgnores: ['**/pdf*.js', '**/pdf*.mjs'],
        maximumFileSizeToCacheInBytes: 1024 * 1024,
      },
      manifest: {
        name: 'Helsetracker',
        short_name: 'Helse',
        description:
          'Følg medisindoser, symptomer og helsedata fra Garmin – for å se sammenhenger over tid',
        theme_color: '#0d9488',
        background_color: '#f1f5f9',
        display: 'standalone',
        start_url: '/',
        lang: 'no',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
