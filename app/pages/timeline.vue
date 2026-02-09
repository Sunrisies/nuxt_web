<template>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto w-full md:w-3/4 px-2 xs:px-4 lg:px-0 py-8">
      <!-- 页面标题 -->
      <h1 class="text-3xl font-bold mb-8 text-foreground">
        时光轴
      </h1>

      <!-- 日历热图 - 大屏显示 -->
      <div class="flex justify-start mb-8">
        <div class="my-4 w-full border-red-400 hidden lg:block">
          <TimelineCalendarHeatmap
            v-if="warehouse.length > 0"
            :warehouse="warehouse"
          />
        </div>
      </div>

      <!-- 使用 NuxtUI 的 UChangelogVersions 组件 -->
      <UChangelogVersions :versions="versions" />
    </div>

    <!-- 回到顶部按钮 -->
    <ScrollToTopButton />
  </div>
</template>

<script setup lang="ts">
import type { IArticle } from "@/types/article"
import type { ChangelogVersionProps } from "@nuxt/ui"
// import type { warehouseType } from '@/types/blog'
export type warehouseType = (string | number)[][]
// 元数据配置
useHead({
  title: "时光轴 | 朝阳的码农札记",
  meta: [
    {
      name: "description",
      content: "记录技术成长的点点滴滴，分享学习历程和技术见解，见证每一步成长的足迹。"
    },
    {
      name: "keywords",
      content: "技术博客,时光轴,学习记录,技术成长,编程笔记"
    },
    // OpenGraph
    {
      property: "og:title",
      content: "时光轴 | 朝阳的码农札记"
    },
    {
      property: "og:description",
      content: "记录技术成长的点点滴滴，分享学习历程和技术见解，见证每一步成长的足迹。"
    },
    {
      property: "og:type",
      content: "website"
    },
    {
      property: "og:url",
      content: "/timeline"
    },
    {
      property: "og:image",
      content: "https://aly.chaoyang1024.top/uploads/2025/2/26/og-timeline.jpg"
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
      content: "时光轴封面图"
    },
    // Twitter
    {
      name: "twitter:card",
      content: "summary_large_image"
    },
    {
      name: "twitter:title",
      content: "时光轴 | 朝阳的码农札记"
    },
    {
      name: "twitter:description",
      content: "记录技术成长的点点滴滴，分享学习历程和技术见解。"
    },
    {
      name: "twitter:image",
      content: "https://aly.chaoyang1024.top/uploads/2025/2/26/og-timeline.jpg"
    }
  ],
  link: [
    {
      rel: "canonical",
      href: "/timeline"
    }
  ]
})

// 响应式数据
const articles = ref<IArticle[]>([])
const warehouse = ref<warehouseType>([])
const loading = ref(true)

// 获取时光轴文章
const getTimelineArticles = async () => {
  try {
    const { data } = await useAsyncData("timeline", () =>
      http({
        url: `/v1/posts?page=1&limit=100`
      })
    )
    articles.value = data.value?.data || []
  } catch (error) {
    console.error("获取文章失败:", error)
    articles.value = []
  }
}

// 获取仓库数据（用于热图）
const getWarehouse = async () => {
  try {
    const { data } = await useAsyncData("warehouse", () =>
      http({
        url: `/v1/posts/uploadTime`
      })
    )
    console.log(data.value, "uihuryquiwyeuiqwueiqwoye")
    warehouse.value = data.value || []
  } catch (error) {
    console.error("获取仓库数据失败:", error)
    warehouse.value = []
  }
}

// 初始化数据
// onMounted(async () => {
await Promise.all([getTimelineArticles(), getWarehouse()])
loading.value = false

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

// })
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
