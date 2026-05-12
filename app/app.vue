<template>
  <Html lang="zh-CN" />

  <meta name="b3fd8ca0bc639bedcd07e98429ae11a6e02e1b2a" content="b3fd8ca0bc639bedcd07e98429ae11a6e02e1b2a" />
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

useHead({
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | 朝阳的码农札记` : "朝阳的码农札记"),
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
      innerHTML: `(function(myfnc){
        var d = document,
            s = d.createElement('script'),
            l = d.scripts[d.scripts.length - 1];
        s.settings = myfnc || {};
        s.src = "\/\/untimely-hello.com\/b\/XIVVs\/d.Ggle0jYpW\/cm\/GeWmQ9Pu\/ZZUWliklPnTgYw5cMzzGk\/x\/NtTEMStUNJj\/kVzROfTrEZ1VN\/wY";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({})`
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
