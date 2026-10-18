<template>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto w-full md:w-3/4 px-2 xs:px-4 lg:px-0 py-8">
      <!-- 页面标题 -->
      <h1 class="text-3xl font-bold mb-8 text-foreground">
        时光轴
      </h1>

      <!-- 日历热图 - 大屏显示 -->
      <div class="flex justify-start mb-8">
        <div ref="chartTarget" class="my-4 w-full hidden lg:block min-h-72">
          <ClientOnly>
            <LazyTimelineCalendarHeatmap
              v-if="showChart && warehouse.length > 0"
              :warehouse="warehouse"
            />
            <template #fallback><div class="h-72" /></template>
          </ClientOnly>
        </div>
      </div>

      <!-- 使用 NuxtUI 的 UChangelogVersions 组件 -->
      <PostChangelogVersions :versions="versions" />
      <UAlert v-if="feedError" color="warning" title="加载失败，请重试" class="mt-4" />
      <UButton v-if="hasMore" :loading="feedLoading" class="mt-6" @click="loadMore">加载更多</UButton>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { PostList, warehouseType } from "~/types/blog"
import type { ChangelogVersionProps } from "@nuxt/ui"

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
const pageUrl = `${siteUrl}/timeline`
const seoTitle = "时光轴 | 朝阳的码农札记"
const seoDescription = "记录技术成长的点点滴滴，分享学习历程和技术见解，见证每一步成长的足迹。"
const seoImage = "https://aly.chaoyang1024.top/uploads/2025/2/26/og-timeline.jpg"
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  keywords: "技术博客,时光轴,学习记录,技术成长,编程笔记",
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: "website",
  ogUrl: pageUrl,
  ogImage: seoImage,
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImageAlt: "时光轴封面图",
  twitterCard: "summary_large_image",
  twitterTitle: seoTitle,
  twitterDescription: "记录技术成长的点点滴滴，分享学习历程和技术见解。",
  twitterImage: seoImage
})

useHead({
  link: [
    {
      rel: "canonical",
      href: pageUrl
    }
  ]
})

const [{ data: posts, error: postsError }, { data: warehouseData }] = await Promise.all([
  useAsyncData("timeline:posts", (_app, { signal }) => http<PostList>({ url: "/public/posts", query: { page: 1, limit: 100 }, signal })),
  useAsyncData("warehouse", (_app, { signal }) => http<warehouseType>({ url: "/public/warehouse", signal }))
])
if (postsError.value) throw publicPageError(postsError.value)
const chartTarget = ref<HTMLElement>()
const showChart = ref(false)
let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!chartTarget.value) return
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && window.matchMedia("(min-width: 1024px)").matches) {
      showChart.value = true
      observer?.disconnect()
    }
  }, { rootMargin: "100px" })
  observer.observe(chartTarget.value)
})
onBeforeUnmount(() => observer?.disconnect())
const { posts: articles, hasMore, loading: feedLoading, error: feedError, loadMore } = usePostFeed(posts, () => ({}), () => "timeline")
const warehouse = computed(() => warehouseData.value || [])

// 将文章数据转换为 UChangelogVersions 需要的格式
const versions = computed<ChangelogVersionProps[]>(() => {
  return articles.value.map(article => ({
    // 组件内置属性
    title: article.title, // 会在 #title 插槽中被覆盖，但保留以供组件内部使用
    description: article.description, // 会在 #description 插槽中被覆盖
    date: article.publish_time, // 重要：组件会据此排序
    to: `/article/${article.uuid}`, // 用于生成链接
    // 你需要的自定义数据
    views: article.views || 0,
    tags: article.tags || [],
    // 可以在这里配置组件的一些UI属性
    ui: {
      // 例如自定义容器类
      container: "gap-8!"
    }
  }))
})

</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
