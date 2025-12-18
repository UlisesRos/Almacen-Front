import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Almacén Manager',
        short_name: 'Almacén',
        description: 'Sistema de gestión de almacén con ventas y inventario',
        theme_color: '#2196f3',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src:"/kiosko.png",
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src:"kiosko.png",
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: "/kiosko.png",
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.githubusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-images',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ]
})