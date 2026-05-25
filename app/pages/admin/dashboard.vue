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
        :empty-state="{ icon: 'i-heroicons-document-text', label: '暂无文章' }"
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
            :to="`/admin/posts/${row.original.id}`"
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
definePageMeta({
  layout: "admin",
  middleware: "admin-auth"
})

import { http } from "~/composables/http"

const loading = ref(true)
const stats = ref([
  { label: "文章总数", value: "—", icon: "i-heroicons-document-text", bg: "bg-blue-500" },
  { label: "分类数",   value: "—", icon: "i-heroicons-tag",           bg: "bg-green-500" },
  { label: "标签数",   value: "—", icon: "i-heroicons-hashtag",       bg: "bg-purple-500" },
  { label: "总浏览量", value: "—", icon: "i-heroicons-eye",           bg: "bg-amber-500" },
])

const recentPosts = ref<any[]>([])
const postColumns = [
  { id: "title",        key: "title",        accessorKey: "title",        label: "标题" },
  { id: "status",       key: "status",       accessorKey: "status",       label: "状态" },
  { id: "publish_time", key: "publish_time", accessorKey: "publish_time", label: "发布时间" },
  { id: "actions",      key: "actions",      accessorKey: "actions",      label: "操作" },
]

onMounted(async () => {
  try {
    const [postsRes, categoriesRes, tagsRes, allPostsRes] = await Promise.all([
      http<{ data: any[], pagination: { total: number } }>({ url: "/v1/posts?page=1&limit=5" }),
      http<{ data: any[], pagination: { total: number } }>({ url: "/v1/categories?page=1&limit=1" }),
      http<{ data: any[], pagination: { total: number } }>({ url: "/v1/tags?page=1&limit=1" }),
      http<{ data: any[], pagination: { total: number } }>({ url: "/v1/posts?page=1&limit=200" }),
    ])
    recentPosts.value = postsRes?.data?.slice(0, 5) || []
    stats.value[0].value = String(postsRes?.pagination?.total ?? 0)
    stats.value[1].value = String(categoriesRes?.pagination?.total ?? 0)
    stats.value[2].value = String(tagsRes?.pagination?.total ?? 0)
    // 汇总所有文章浏览量
    const totalViews = allPostsRes?.data?.reduce((sum: number, post: any) => sum + (post.views || 0), 0) || 0
    stats.value[3].value = String(totalViews)
  } catch (e) {
    console.error("获取仪表盘数据失败", e)
  } finally {
    loading.value = false
  }
})
</script>
