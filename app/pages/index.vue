<template>
  <div class="flex min-h-screen flex-col bg-[#f9f9f9] dark:bg-zinc-900">
    <main class="flex-1">
      <section class="py-8 md:py-8">
        <div class="mx-auto max-w-3xl text-center">
          <h1 class="mb-4 text-3xl font-bold tracking-tight md:text-4xl">朝阳的码农札记</h1>
          <HomeSentencesCarousel />
        </div>
      </section>

      <section class="container pb-8">
        <div class="grid gap-10 md:grid-cols-3">
          <div class="md:col-span-2">
            <div class="grid gap-6">
              <HomeBlogPostCard v-for="item in blogs" :key="item.id" :blog="item" />
            </div>
            <div class="mt-8 text-center">
              <UButton variant="outline" class="group" :to="'/blog/1'" trailing-icon="i-heroicons-arrow-right">
                查看更多
              </UButton>
            </div>
          </div>
          <div class="md:col-span-1">
            <HomeProfileCard />

            <div class="mt-8 rounded-lg border bg-card p-4 shadow-sm">
              <h2 class="mb-4 text-lg font-medium">标签</h2>
              <HomeTagCloud :tags="tags" />
            </div>

            <div class="mt-8 rounded-lg border bg-card p-4 shadow-sm">
              <h2 class="mb-4 text-lg font-medium">最新文章</h2>
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
import { ref } from 'vue'
import type { IBlog, Tag } from '@/types/blog'
import { http } from '~/composables/http'
// 元数据
useHead({
  title: '朝阳的码农札记 | 全栈开发者的技术分享与经验总结',
  meta: [
    {
      name: 'description',
      content:
        '这是一个专注于全栈开发、Web技术、云原生和DevOps的技术博客。在这里，我分享实用的编程技巧、项目经验和技术见解，帮助开发者解决实际问题，提升编程技能。欢迎加入我的学习社区！'
    },
    {
      name: 'keywords',
      content: '全栈开发,Web开发,React,Node.js,云原生,DevOps,技术博客,编程学习,最佳实践'
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:locale',
      content: 'zh_CN'
    },
    {
      property: 'og:url',
      content: 'https://sunrise1024.top'
    },
    {
      property: 'og:title',
      content: '朝阳的码农札记 | 全栈开发者的技术分享与经验总结'
    },
    {
      property: 'og:description',
      content:
        '这是一个专注于全栈开发、Web技术、云原生和DevOps的技术博客。在这里，我分享实用的编程技巧、项目经验和技术见解，帮助开发者解决实际问题，提升编程技能。'
    },
    {
      property: 'og:site_name',
      content: '朝阳的码农札记'
    },
    {
      property: 'og:image',
      content: 'https://sunrise1024.top/og-image.png'
    },
    {
      property: 'og:image:width',
      content: '1200'
    },
    {
      property: 'og:image:height',
      content: '630'
    },
    {
      property: 'og:image:alt',
      content: '朝阳的码农札记'
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image'
    },
    {
      name: 'twitter:title',
      content: '朝阳的码农札记 | 全栈开发者的技术分享与经验总结'
    },
    {
      name: 'twitter:description',
      content: '这是一个专注于全栈开发、Web技术、云原生和DevOps的技术博客。在这里，我分享实用的编程技巧、项目经验和技术见解。'
    },
    {
      name: 'twitter:image',
      content: 'https://sunrise1024.top/og-image.png'
    },
    {
      name: 'robots',
      content: 'index, follow'
    },
    {
      name: 'author',
      content: '朝阳'
    }
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://sunrise1024.top'
    },
    {
      rel: 'icon',
      href: '/favicon.ico'
    },
    {
      rel: 'shortcut icon',
      href: '/favicon.ico'
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png'
    }
  ]
})

// 响应式数据
const blogs = ref<IBlog[]>([])
const tags = ref<Tag[]>([])

// API 函数
const getPostApi = async () => {
  const { data } = await useAsyncData('posts', () =>
    http({
      url: `/v1/posts?page=1&limit=12`
    })
  )
  return data.value || []
}

const getTags = async () => {
  const { data } = await useAsyncData('tagsCount', () =>
    http({
      url: '/v1/tags/count'
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
  console.error('获取数据失败:', error)
}
</script>
