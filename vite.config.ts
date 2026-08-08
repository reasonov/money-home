import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}
const fromEnv = process.env.APP_VERSION?.trim()
const appVersion = fromEnv
  ? fromEnv.startsWith('v')
    ? fromEnv
    : `v${fromEnv}`
  : `v${pkg.version}`
const base = process.env.VITE_BASE_PATH || '/'
const normalizedBase = base.endsWith('/') ? base : `${base}/`

export default defineConfig(({ mode }) => ({
  base: normalizedBase,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    vue(),
    ...(mode !== 'production' ? [vueDevTools()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'Money Home',
        short_name: 'Money Home',
        description: 'Семейный план покупок из общего бюджета',
        theme_color: '#0F766E',
        background_color: '#F2F5F7',
        display: 'standalone',
        lang: 'ru',
        start_url: normalizedBase,
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: `${normalizedBase}index.html`,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
