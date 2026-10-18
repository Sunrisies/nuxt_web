import tailwindcss from "@tailwindcss/vite"
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@nuxt/fonts",
    "@nuxt/eslint",
    "@nuxtjs/mdc",
    "@nuxt/image",
    "@nuxtjs/device",
    "@nuxtjs/color-mode",
    "nuxt-umami", // 暂时禁用，umami.sunrise1024.top 不可达
    "@nuxtjs/sitemap"
  ],
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "layout", mode: "out-in" }
  },
  css: ["./app/assets/css/tailwind.css", "./app/assets/css/main.css"],
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || "https://sunrise1024.top"
  },
  runtimeConfig: {
    apiBase: process.env.NUXT_API_BASE || process.env.NUXT_PUBLIC_API_BASE || "https://api.sunrise1024.top/api",
    apiTimeout: 8000,
    apiResolveAddress: "",
    apiNetworkInterface: "",
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "https://sunrise1024.top"
    }
  },

  compatibilityDate: "2025-07-15",
  nitro: {
    compressPublicAssets: true,
    externals: {
      external: []
    },
    routeRules: {
      // 为 404 页面启用静态生成
      "/404": { static: true },
      // 后台管理 → SPA 模式（不进行 SSR）
      "/admin": { ssr: false },
      "/admin/**": { ssr: false },
      // 云剪贴板 → 纯客户端（避免 SSR 访问浏览器 API 报 500）
      "/clipboard": { ssr: false },
      "/api/public/**": { headers: { "cache-control": "no-store" } },
      "/api/v1/**": { headers: { "cache-control": "no-store" } },
      "/navigationBar": { swr: 3600 },
      "/_nuxt/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } }
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
    plugins: [tailwindcss()]
  },
  eslint: {
    config: {
      stylistic: false
    }
  },
  image: {
    domains: ["img.sunrise1024.top"],
    provider: "articleImages",
    providers: { articleImages: { provider: "~/providers/article-images" } },
    ipx: {}
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
  },
  sitemap: {
    cacheMaxAgeSeconds: 0,
    sources: ["/api/__sitemap__/urls"]
  },
  umami: {
    autoTrack: true,
    ignoreLocalhost: true
  }
})
