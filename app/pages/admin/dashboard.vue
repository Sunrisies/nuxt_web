<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">仪表盘</h1>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-4">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-lg"
            :class="stat.bg"
          >
            <UIcon :name="stat.icon" class="h-6 w-6 text-white" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stat.value }}</p>
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
          </div>
        </div>
      </UCard>
    </div>
    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <UCard><p class="text-sm text-muted">近 7 日有效浏览</p><p class="mt-1 text-2xl font-bold">{{ analytics.views_7d }}</p></UCard>
      <UCard><p class="text-sm text-muted">近 7 日读者反馈</p><p class="mt-1 text-2xl font-bold">{{ analytics.feedback_7d }}</p></UCard>
      <UCard><p class="text-sm text-muted">邮件订阅</p><p class="mt-1 text-2xl font-bold">{{ analytics.subscribers }}</p></UCard>
    </div>
    <div class="mt-4 flex items-center justify-between rounded-lg border border-default bg-muted/30 px-4 py-3">
      <div><p class="font-medium">访问分析</p><p class="text-sm text-muted">查看访问来源、设备、地区、页面路径和停留趋势。</p></div>
      <UButton href="https://umami.sunrise1024.top" target="_blank" icon="i-heroicons-arrow-top-right-on-square">打开 Umami</UButton>
    </div>

    <div class="mt-8 grid gap-6 lg:grid-cols-3">
      <UCard class="lg:col-span-2">
        <template #header><h2 class="text-lg font-semibold">发布概览</h2></template>
        <div class="grid grid-cols-3 gap-3 text-center"><div><p class="text-2xl font-bold">{{ publishStats.published }}</p><p class="text-sm text-muted">已发布</p></div><div><p class="text-2xl font-bold">{{ publishStats.drafts }}</p><p class="text-sm text-muted">草稿</p></div><div><p class="text-2xl font-bold">{{ publishStats.offline }}</p><p class="text-sm text-muted">已下线</p></div></div>
      </UCard>
      <UCard><template #header><h2 class="text-lg font-semibold">内容健康度</h2></template><p class="text-sm text-muted">已发布文章占比</p><p class="mt-2 text-3xl font-bold">{{ publishRate }}%</p></UCard>
    </div>

    <UCard class="mt-6">
      <template #header><h2 class="text-lg font-semibold">热门文章</h2></template>
      <div v-if="topPosts.length" class="space-y-3"><div v-for="(post, index) in topPosts" :key="post.uuid" class="flex items-center gap-3"><span class="w-5 text-sm text-muted">{{ index + 1 }}</span><NuxtLink :to="`/admin/posts/${post.uuid}/edit`" class="min-w-0 flex-1 truncate hover:text-primary">{{ post.title }}</NuxtLink><span class="text-sm text-muted">{{ post.views || 0 }} 浏览</span></div></div><p v-else class="text-sm text-muted">暂无浏览数据</p>
    </UCard>

    <!-- 最近文章 -->
    <UCard class="mt-8">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">最近文章</h2>
          <UButton to="/admin/posts" variant="ghost" size="sm">
            查看全部
          </UButton>
        </div>
      </template>

      <UTable
        :data="recentPosts"
        :columns="postColumns"
        :loading="loading"
        empty="暂无文章"
      >
        <template #status-cell="{ row }">
          <UBadge
            :label="row.original.is_top ? '置顶' : '普通'"
            :color="row.original.is_top ? 'warning' : 'neutral'"
            variant="subtle"
          />
        </template>
        <template #actions-cell="{ row }">
          <UButton
            :to="`/admin/posts?edit=${encodeURIComponent(row.original.uuid)}`"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-pencil-square"
          />
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { AdminPost, AdminNamedItem } from "~/types/admin"
import { http } from "~/composables/http"

definePageMeta({
  layout: "admin",
  middleware: "admin-auth"
})

const loading = ref(true)
const stats = ref([
  { label: "文章总数", value: "—", icon: "i-heroicons-document-text", bg: "bg-blue-500" },
  { label: "分类数",   value: "—", icon: "i-heroicons-tag",           bg: "bg-green-500" },
  { label: "标签数",   value: "—", icon: "i-heroicons-hashtag",       bg: "bg-purple-500" },
  { label: "总浏览量", value: "—", icon: "i-heroicons-eye",           bg: "bg-amber-500" },
])

const recentPosts = ref<AdminPost[]>([])
const publishStats = ref({ published: 0, drafts: 0, offline: 0 })
const topPosts = ref<AdminPost[]>([])
const analytics = ref({ views_7d: 0, feedback_7d: 0, subscribers: 0 })
const publishRate = computed(() => {
  const total = publishStats.value.published + publishStats.value.drafts + publishStats.value.offline
  return total ? Math.round(publishStats.value.published / total * 100) : 0
})
const postColumns = [
  { id: "title",        key: "title",        accessorKey: "title",        header: "标题" },
  { id: "status",       key: "status",       accessorKey: "status",       header: "状态" },
  { id: "publish_time", key: "publish_time", accessorKey: "publish_time", header: "发布时间" },
  { id: "actions",      key: "actions",      accessorKey: "actions",      header: "操作" },
]

onMounted(async () => {
  try {
    const [postsRes, categoriesRes, tagsRes, allPostsRes, analyticsRes] = await Promise.all([
      http<{ data: AdminPost[], pagination: { total: number } }>({ url: "/v1/posts?page=1&limit=5" }),
      http<{ data: AdminNamedItem[], pagination: { total: number } }>({ url: "/v1/categories?page=1&limit=1" }),
      http<{ data: AdminNamedItem[], pagination: { total: number } }>({ url: "/v1/tags?page=1&limit=1" }),
      http<{ data: AdminPost[], pagination: { total: number } }>({ url: "/v1/posts?page=1&limit=100" }),
      http<{ total_posts: number, total_views: number, published: number, drafts: number, offline: number, views_7d: number, feedback_7d: number, subscribers: number }>({ url: "/v1/analytics/dashboard" }),
    ])
    recentPosts.value = postsRes?.data?.slice(0, 5) || []
    stats.value[0].value = String(analyticsRes?.total_posts ?? postsRes?.pagination?.total ?? 0)
    stats.value[1].value = String(categoriesRes?.pagination?.total ?? 0)
    stats.value[2].value = String(tagsRes?.pagination?.total ?? 0)
    // 汇总所有文章浏览量
    const allPosts = [...(allPostsRes?.data || [])]
    for (let page = 2; allPosts.length < allPostsRes.pagination.total; page++) {
      const result = await http<{ data: AdminPost[] }>({ url: `/v1/posts?page=${page}&limit=100` })
      if (!result.data.length) throw new Error("文章统计数据不完整")
      allPosts.push(...result.data)
    }
    const totalViews = analyticsRes?.total_views ?? (allPosts.reduce((sum: number, post: AdminPost) => sum + (post.views || 0), 0) || 0)
    stats.value[3].value = String(totalViews)
    publishStats.value = { published: analyticsRes?.published ?? allPosts.filter(post => post.is_publish).length, drafts: analyticsRes?.drafts ?? allPosts.filter(post => !post.is_publish && !post.is_hide).length, offline: analyticsRes?.offline ?? allPosts.filter(post => post.is_hide).length }
    analytics.value = analyticsRes || analytics.value
    topPosts.value = [...allPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)
  } catch (e) {
    console.error("获取仪表盘数据失败", e)
  } finally {
    loading.value = false
  }
})
</script>
