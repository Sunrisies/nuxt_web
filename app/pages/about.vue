<template>
  <div class="min-h-screen bg-linear-to-br from-background to-muted/20">
    <div class="container mx-auto px-4 py-8">
      <AboutChaoYangProfile />
      <div class="mt-12 space-y-12">
        <AboutSkillsSection />
        <AboutCodeFarmerNotes />
        <AboutContactSection />
      </div>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
const pageUrl = `${siteUrl}/about`
const ogImage = `${siteUrl}/og-image.png`

useHead({
  title: "关于朝阳 | 码农札记与个人简介",
  meta: [
    {
      name: "description",
      content: "深入了解朝阳的成长经历、技术专长与个人故事，探索一位热爱编程与分享的前端开发者的札记与成长之路。"
    },
    {
      name: "keywords",
      content: "关于朝阳,个人简介,前端开发者,技术博客,成长故事,编程札记,码农札记"
    },
    {
      property: "og:title",
      content: "关于朝阳 | 码农札记与个人简介"
    },
    {
      property: "og:description",
      content: "深入了解朝阳的成长经历、技术专长与个人故事，探索一位热爱编程与分享的前端开发者的札记与成长之路。"
    },
    {
      property: "og:url",
      content: pageUrl
    },
    {
      property: "og:type",
      content: "profile"
    },
    {
      property: "og:locale",
      content: "zh_CN"
    },
    {
      property: "og:image",
      content: ogImage
    },
    {
      property: "og:image:width",
      content: "1200"
    },
    {
      property: "og:image:height",
      content: "630"
    },
    {
      property: "og:image:alt",
      content: "关于朝阳 | 码农札记与个人简介"
    },
    {
      name: "twitter:card",
      content: "summary_large_image"
    },
    {
      name: "twitter:title",
      content: "关于朝阳 | 码农札记与个人简介"
    },
    {
      name: "twitter:description",
      content: "深入了解朝阳的成长经历、技术专长与个人故事，探索一位热爱编程与分享的前端开发者的札记与成长之路。"
    },
    {
      name: "twitter:image",
      content: ogImage
    },
    {
      name: "robots",
      content: "index, follow"
    }
  ],
  link: [
    {
      rel: "canonical",
      href: pageUrl
    }
  ]
})
</script>
