<template>
  <Html lang="zh-CN" />

  <meta
    name="b3fd8ca0bc639bedcd07e98429ae11a6e02e1b2a"
    content="b3fd8ca0bc639bedcd07e98429ae11a6e02e1b2a"
  >
  <UApp :locale="zh_cn">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { zh_cn } from "@nuxt/ui/locale"

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
console.log(121212)
useHead({
  titleTemplate: titleChunk =>
    titleChunk ? `${titleChunk} | 朝阳的码农札记` : "朝阳的码农札记",
  meta: [
    {
      name: "description",
      content: "专注全栈开发、Web 技术和工程实践的中文技术博客。"
    },
    {
      property: "og:site_name",
      content: "朝阳的码农札记"
    }
  ],
  link: [
    {
      rel: "canonical",
      href: siteUrl
    }
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "朝阳的码农札记",
        "url": siteUrl,
        "logo": `${siteUrl}/favicon.ico`,
        "sameAs": ["https://github.com/Sunrisies"]
      })
    },
    {
      src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5513384447977720",
      async: true,
      crossorigin: "anonymous"
    }
  ]
})
</script>

<style lang="scss" scoped></style>
