import tailwindcss from "@tailwindcss/vite"
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/fonts", "@nuxt/eslint", "@nuxtjs/mdc", "@nuxt/content"],
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" }
  },
  css: ["./app/assets/css/tailwind.css", "./app/assets/css/main.css"],
  runtimeConfig: {
    // Private keys are only available on the server
    apiSecret: "123",

    // Public keys that are exposed to the client
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000/api" : "/api")
    }
  },
  routeRules: {
    // 为 404 页面启用静态生成
    "/404": { static: true }
  },
  compatibilityDate: "2025-07-15",
  nitro: {
    externals: {
      external: []
    }
  },
  vite: {
    optimizeDeps: {
      include: [
        "@nuxt/ui > prosemirror-state",
        "@nuxt/ui > prosemirror-transform",
        "@nuxt/ui > prosemirror-model",
        "@nuxt/ui > prosemirror-view",
        "@nuxt/ui > prosemirror-gapcursor"
      ]
    },
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: [],
        output: {
          manualChunks: {
            // 确保 @vueuse 被打包进单独的 chunk
            vueuse: ["@vueuse/core"]
          }
        }
      }
    }
  },
  eslint: {
    config: {
      stylistic: {
        quotes: "double",
        commaDangle: "never",
        braceStyle: "1tbs"
      }
    }
  },
  fonts: {
    provider: "local"
  },
  icon: {
    customCollections: [
      {
        prefix: "custom",
        dir: "./app/assets/icons"
      }
    ]
  }
})
