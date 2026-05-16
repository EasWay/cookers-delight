import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.png",
          "icons/*.png",
          "assets/**/*"
        ],
        manifest: false,
        // We use our own manifest.json files
        
        workbox: {
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,woff2}"
          ],
          
          // Cache strategies:
          runtimeCaching: [
            {
              // API calls — Network first, fallback cache
              urlPattern: /^https?:\/\/(localhost:5000|cookers-delight-api\.onrender\.com)\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24
                },
                networkTimeoutSeconds: 10,
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Images — Cache first
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            },
            {
              // Google Fonts
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            },
            {
              // Unsplash images
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "unsplash-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7
                }
              }
            }
          ],
          
          // Skip waiting — update immediately
          skipWaiting: true,
          clientsClaim: true,
          
          // Offline fallback page
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [
            /^\/api/,
            /^\/uploads/,
            /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2|ico)$/ // Don't fallback for missing assets
          ]
        },
        
        devOptions: {
          enabled: true,
          type: "module"
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  }
})
