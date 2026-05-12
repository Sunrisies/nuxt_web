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
const seoTitle = "关于朝阳 | 码农札记与个人简介"
const seoDescription = "深入了解朝阳的成长经历、技术专长与个人故事，探索一位热爱编程与分享的前端开发者的札记与成长之路。"

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  keywords: "关于朝阳,个人简介,前端开发者,技术博客,成长故事,编程札记,码农札记",
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: pageUrl,
  ogType: "profile",
  ogLocale: "zh_CN",
  ogImage: ogImage,
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImageAlt: seoTitle,
  twitterCard: "summary_large_image",
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: ogImage,
  robots: "index, follow"
})

useHead({
  link: [
    {
      rel: "canonical",
      href: pageUrl
    }
  ],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: "关于朝阳",
        url: pageUrl,
        mainEntity: {
          "@type": "Person",
          name: "朝阳",
          url: pageUrl,
          image: ogImage,
          sameAs: ["https://github.com/Sunrisies"]
        }
      })
    }
  ]
})
</script>
