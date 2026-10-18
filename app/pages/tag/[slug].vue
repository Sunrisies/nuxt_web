<template>
  <div class="container mx-auto w-full md:w-3/4 px-2 xs:px-4 lg:px-0 py-8">
    <PostChangelogVersions
      :versions="versions"
      indicator-class="start-56"
    />
    <UAlert v-if="feedError" color="warning" title="加载失败，请重试" class="mt-4" />
    <UButton v-if="hasMore" :loading="feedLoading" class="mt-6" @click="loadMore">加载更多</UButton>
  </div>
</template>

<script setup lang="ts">
import type { ChangelogVersionProps } from "@nuxt/ui"

import type { PostList } from "~/types/blog"

const route = useRoute()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
const id = computed(() => String(route.params.slug))
const { data: tagsRes, error: tagsError } = await usePublicTags()
if (tagsError.value) throw publicPageError(tagsError.value)
const tagId = computed(() => tagsRes.value?.find(tag => tag.name === id.value)?.id)
if (!tagId.value) throw createError({ statusCode: 404, statusMessage: "Tag not found" })
const { data: postsRes, error: postsError } = await useAsyncData(() => `tag:posts:${id.value}`, (_app, { signal }) => {
  if (!tagId.value) throw createError({ statusCode: 404, statusMessage: "Tag not found" })
  return http<PostList>({ url: "/public/posts", query: { limit: 100, tag: tagId.value }, signal })
})
if (postsError.value) throw publicPageError(postsError.value)
watch(postsError, error => { if (error) showError(publicPageError(error)) })

const { posts: articles, hasMore, loading: feedLoading, error: feedError, loadMore } = usePostFeed(postsRes, () => ({ tag: tagId.value! }), () => id.value)

const pageUrl = computed(() => `${siteUrl}/tag/${encodeURIComponent(id.value)}`)
const seoTitle = computed(() => `${id.value} 标签文章 | 朝阳的码农札记`)
const seoDescription = computed(() => `查看标签 ${id.value} 下的所有技术文章与实践记录。`)
const seoImage = `${siteUrl}/blog.webp`

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: "website",
  ogUrl: pageUrl,
  ogImage: seoImage,
  twitterCard: "summary_large_image",
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
  robots: "index, follow"
})

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: pageUrl.value
    }
  ]
}))
// 将文章数据转换为 UChangelogVersions 需要的格式
const versions = computed<ChangelogVersionProps[]>(() => {
  return articles.value.map(post => ({
    // 组件内置属性
    title: post.title, // 会在 #title 插槽中被覆盖，但保留以供组件内部使用
    description: post.description, // 会在 #description 插槽中被覆盖
    date: formatDateForDisplay(post.publish_time, { showWeekday: false }), // 重要：组件会据此排序
    to: `/article/${post.uuid}`, // 用于生成链接
    // 你需要的自定义数据
    views: post.views || 0,
    tags: post.tags || [],
    // 可以在这里配置组件的一些UI属性
    ui: {
      // 例如自定义容器类
      container: "gap-8!",
      indicator: "w-56" // 你可以根据需要自定义指示器样式
    }

  }))
})
</script>

<style scoped lang="scss"></style>
