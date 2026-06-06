import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-maskable.svg'],
      manifest: {
        id: '/',
        name: 'EduConsole — School Management',
        short_name: 'EduConsole',
        description: 'Teachers, students, classes, and guardians in one workspace.',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/pwa-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Home',
            url: '/dashboard',
            description: 'Open your overview',
          },
          {
            name: 'Sign in',
            short_name: 'Login',
            url: '/login',
            description: 'Access your account',
          },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      // Service worker required for install prompt (beforeinstallprompt).
      devOptions: {
        // Off in dev — enabled SW + HMR caused continuous full-page reload loops.
        enabled: false,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
})
