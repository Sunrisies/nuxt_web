<template>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto w-full md:w-3/4 px-2 xs:px-4 lg:px-0 py-8">
      <!-- 页面标题 -->
      <h1 class="text-3xl font-bold mb-8 text-foreground">时光轴</h1>

      <!-- 日历热图 - 大屏显示 -->
      <div class="flex justify-start mb-8">
        <div class="my-4 w-full border-red-400 hidden lg:block">
          <TimelineCalendarHeatmap v-if="warehouse.length > 0" :warehouse="warehouse" />
        </div>
      </div>

      <!-- 时光轴内容 -->
      <div class="relative border-l-2 border-primary/30 pl-4 md:pl-7.5 ml-2 md:ml-10">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center py-12">
          <UISpinner class="w-8 h-8" />
        </div>

        <!-- 文章列表 -->
        <div v-else-if="articles.length > 0">
          <div v-for="article in articles" :key="article.uuid || article.id" class="mb-8 relative w-full">
            <!-- 时间轴节点 -->
            <div class="absolute -left-6.25 md:-left-10.25 w-5 h-5 bg-background border-2 border-primary rounded-full" />

            <!-- 文章卡片 -->
            <div class="group block p-4 md:p-6 bg-card hover:bg-accent rounded-lg transition-colors duration-200">
              <!-- 日期 -->
              <time class="text-sm text-muted-foreground mb-2 block">
                {{ formatDate(article.publish_time) }}
              </time>

              <!-- 文章标题 -->
              <h2 class="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                <NuxtLink :to="`/article/${article.uuid}`" class="hover:underline">
                  {{ article.title }}
                </NuxtLink>
              </h2>

              <!-- 文章描述 -->
              <p class="text-muted-foreground line-clamp-2">
                {{ article.description }}
              </p>

              <!-- 标签 -->
              <div class="flex flex-wrap gap-2 mt-3">
                <span
                  v-for="tag in article.tags"
                  :key="tag.id"
                  class="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full"
                >
                  #{{ tag.name }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-12 text-muted-foreground">
          <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto mb-4" />
          <p>暂无文章</p>
        </div>
      </div>
    </div>

    <!-- 回到顶部按钮 -->
    <ScrollToTopButton />
  </div>
</template>

<script setup lang="ts">
import type { IArticle } from '@/types/article'
// import type { warehouseType } from '@/types/blog'
export type warehouseType = (string | number)[][]
// 元数据配置
useHead({
  title: '时光轴 | 朝阳的码农札记',
  meta: [
    {
      name: 'description',
      content: '记录技术成长的点点滴滴，分享学习历程和技术见解，见证每一步成长的足迹。'
    },
    {
      name: 'keywords',
      content: '技术博客,时光轴,学习记录,技术成长,编程笔记'
    },
    // OpenGraph
    {
      property: 'og:title',
      content: '时光轴 | 朝阳的码农札记'
    },
    {
      property: 'og:description',
      content: '记录技术成长的点点滴滴，分享学习历程和技术见解，见证每一步成长的足迹。'
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:url',
      content: '/timeline'
    },
    {
      property: 'og:image',
      content: 'https://aly.chaoyang1024.top/uploads/2025/2/26/og-timeline.jpg'
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
      content: '时光轴封面图'
    },
    // Twitter
    {
      name: 'twitter:card',
      content: 'summary_large_image'
    },
    {
      name: 'twitter:title',
      content: '时光轴 | 朝阳的码农札记'
    },
    {
      name: 'twitter:description',
      content: '记录技术成长的点点滴滴，分享学习历程和技术见解。'
    },
    {
      name: 'twitter:image',
      content: 'https://aly.chaoyang1024.top/uploads/2025/2/26/og-timeline.jpg'
    }
  ],
  link: [
    {
      rel: 'canonical',
      href: '/timeline'
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
    const { data } = await useAsyncData('timeline', () =>
      http({
        url: `/v1/posts?page=1&limit=100`
      })
    )
    articles.value = data.value?.data || []
  } catch (error) {
    console.error('获取文章失败:', error)
    articles.value = []
  }
}

// 获取仓库数据（用于热图）
const getWarehouse = async () => {
  try {
    const { data } = await useAsyncData('warehouse', () =>
      http({
        url: `/v1/posts/uploadTime`
      })
    )
    console.log(data.value, 'uihuryquiwyeuiqwueiqwoye')
    warehouse.value = data.value || []
  } catch (error) {
    console.error('获取仓库数据失败:', error)
    warehouse.value = []
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 初始化数据
// onMounted(async () => {
await Promise.all([getTimelineArticles(), getWarehouse()])
loading.value = false
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
