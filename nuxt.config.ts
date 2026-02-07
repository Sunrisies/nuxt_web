import tailwindcss from "@tailwindcss/vite";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/assets/css/tailwind.css', './app/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss()
    ],
    build: {
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            // 确保 @vueuse 被打包进单独的 chunk
            'vueuse': ['@vueuse/core']
          }
        }
      }
    }

  },
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  fonts: {
    provider: "local"
  },
  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: "./app/assets/icons"
      }
    ]
  },
  nitro: {
    externals: {
      external: []
    },
  },
  runtimeConfig: {
    // Private keys are only available on the server
    apiSecret: '123',

    // Public keys that are exposed to the client
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
  },
})