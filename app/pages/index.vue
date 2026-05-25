<template>
  <div class="flex min-h-screen flex-col bg-[#f9f9f9] dark:bg-zinc-900">
    <main class="flex-1">
      <section class="py-8 md:py-8">
        <div class="mx-auto max-w-3xl text-center">
          <h1 class="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            朝阳的码农札记
          </h1>
          <HomeSentencesCarousel />
        </div>
      </section>

      <section class="container pb-8">
        <div class="grid gap-10 md:grid-cols-3">
          <div class="md:col-span-2">
            <div class="grid gap-6">
              <HomeBlogPostCard
                v-for="item in blogs"
                :key="item.id"
                :blog="item"
              />
            </div>
            <div class="mt-8 text-center">
              <UButton
                variant="outline"
                class="group"
                :to="'/blog/1'"
                trailing-icon="i-heroicons-arrow-right"
              >
                查看更多
              </UButton>
            </div>
          </div>
          <div class="md:col-span-1">
            <HomeProfileCard />

            <div class="mt-8 rounded-lg border bg-card p-4 shadow-sm">
              <h2 class="mb-4 text-lg font-medium">
                标签
              </h2>
              <HomeTagCloud :tags="tags" />
            </div>

            <div class="mt-8 rounded-lg border bg-card p-4 shadow-sm">
              <h2 class="mb-4 text-lg font-medium">
                最新文章
              </h2>
              <HomeRecentPostsList :blogs="blogs" />
            </div>
          </div>
        </div>
      </section>
    </main>
    <ScrollToTopButton />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { IBlog, Tag } from "~/types/blog"
import { http } from "~/composables/http"

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
const seoTitle = "朝阳的码农札记 | 全栈开发者的技术分享与经验总结"
const seoDescription
  = "这是一个专注于全栈开发、Web技术、云原生和DevOps的技术博客。在这里，我分享实用的编程技巧、项目经验和技术见解，帮助开发者解决实际问题，提升编程技能。欢迎加入我的学习社区！"
const seoImage = `${siteUrl}/og-image.png`

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  keywords: "全栈开发,Web开发,React,Node.js,云原生,DevOps,技术博客,编程学习,最佳实践",
  ogType: "website",
  ogLocale: "zh_CN",
  ogUrl: siteUrl,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogSiteName: "朝阳的码农札记",
  ogImage: seoImage,
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImageAlt: "朝阳的码农札记",
  twitterCard: "summary_large_image",
  twitterTitle: seoTitle,
  twitterDescription: "这是一个专注于全栈开发、Web技术、云原生和DevOps的技术博客。在这里，我分享实用的编程技巧、项目经验和技术见解。",
  twitterImage: seoImage,
  robots: "index, follow",
  author: "朝阳"
})

useHead({
  link: [
    {
      rel: "canonical",
      href: siteUrl
    },
    {
      rel: "icon",
      href: "/favicon.ico"
    },
    {
      rel: "shortcut icon",
      href: "/favicon.ico"
    },
    {
      rel: "apple-touch-icon",
      href: "/apple-touch-icon.png"
    }
  ],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "朝阳的码农札记",
        "url": siteUrl,
        "inLanguage": "zh-CN",
        "publisher": {
          "@type": "Person",
          "name": "朝阳"
        }
      })
    }
  ]
})

// 响应式数据
const blogs = ref<IBlog[]>([])
const tags = ref<Tag[]>([])

// API 函数
const getPostApi = async () => {
  const { data } = await useAsyncData("posts", () =>
    http({
      url: `/v1/posts?page=1&limit=12`
    })
  )
  return data.value || []
}

const getTags = async () => {
  const { data } = await useAsyncData("tagsCount", () =>
    http({
      url: "/v1/tags/count"
    })
  )
  return data.value || []
}

// 获取数据
try {
  const [postsResponse, tagsResponse] = await Promise.all([getPostApi(), getTags()])
  blogs.value = postsResponse.data
  tags.value = tagsResponse
} catch (error) {
  console.error("获取数据失败:", error)
}
</script>
