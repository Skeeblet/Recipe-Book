import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { getAppVersion } from './scripts/app-version.mjs'

// Version shown in-app (App info, feedback emails). Derived from git at build
// time — see scripts/app-version.mjs — so CI deploys get a new number without
// anyone committing a bump.
const appVersion = getAppVersion()
console.log(`App version: ${appVersion}`)

export default defineConfig({
  base: '/Recipe-Book/',
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'icons/apple-touch-icon.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/Recipe-Book/index.html',
        navigateFallbackDenylist: [/\/api\//],
      },
      manifest: {
        id: '/Recipe-Book/',
        name: 'My Recipe Box',
        short_name: 'Recipe Box',
        start_url: '/Recipe-Book/',
        share_target: {
          action: '/Recipe-Book/',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF7F2',
        theme_color: '#D4622A',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
