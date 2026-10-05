import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Workout Program',
        short_name: 'Workout',
        description: 'Persoonlijke trainingslog',
        lang: 'nl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e0f11',
        theme_color: '#0e0f11',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // PocketBase API and admin dashboard must never be served from the cache.
        navigateFallbackDenylist: [/^\/api\//, /^\/_\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // During development the PocketBase API runs on :8090.
    proxy: { '/api': 'http://127.0.0.1:8090' },
  },
  preview: {
    proxy: { '/api': 'http://127.0.0.1:8090' },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
