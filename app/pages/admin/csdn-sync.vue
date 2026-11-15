<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold">CSDN 同步</h1>
      <p class="mt-1 text-sm text-muted">从 CSDN 博客获取文章列表，选择后同步到本地（保存为草稿）</p>
    </div>

    <UCard class="mb-6">
      <div class="flex items-center gap-3">
        <UButton :loading="fetching" icon="i-heroicons-arrow-down-tray" @click="fetchList">
          {{ fetching ? "获取中..." : "获取文章列表" }}
        </UButton>
        <span v-if="articles.length" class="text-sm text-muted">共 {{ articles.length }} 篇文章</span>
      </div>
    </UCard>

    <UAlert v-if="fetchError" class="mb-6" color="error" :title="fetchError" />

    <UCard v-if="articles.length" class="mb-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <UCheckbox v-model="selectAll" label="全选" @update:model-value="toggleSelectAll" />
          <span class="text-sm text-muted">已选 {{ selectedIds.length }} 篇</span>
        </div>
        <UButton
          :loading="syncing"
          :disabled="selectedIds.length === 0"
          icon="i-heroicons-cloud-arrow-up"
          @click="syncSelected"
        >
          {{ syncing ? "同步中..." : `同步选中 (${selectedIds.length})` }}
        </UButton>
      </div>

      <div class="max-h-[500px] overflow-y-auto">
        <div class="space-y-2">
          <label
            v-for="article in articles"
            :key="article.articleId"
            class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            :class="{ 'bg-primary/5 border-primary/30': selectedIds.includes(article.articleId), 'opacity-60': article.exists }"
          >
            <UCheckbox
              :model-value="selectedIds.includes(article.articleId)"
              :disabled="article.exists"
              @update:model-value="toggleSelect(article.articleId)"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ article.title }}</p>
              <p class="text-sm text-muted">{{ article.postTime }} · {{ article.viewCount }} 次浏览</p>
            </div>
            <UBadge v-if="article.exists" color="neutral" variant="subtle" label="已同步" />
          </label>
        </div>
      </div>
    </UCard>

    <UAlert v-if="syncError" class="mb-6" color="error" :title="syncError" />

    <UCard v-if="result">
      <div class="mb-4 flex flex-wrap items-center gap-4">
        <h2 class="text-lg font-semibold">同步结果</h2>
        <UBadge color="success" variant="subtle">新增 {{ result.created }}</UBadge>
        <UBadge color="warning" variant="subtle">跳过 {{ result.skipped }}</UBadge>
        <UBadge v-if="result.failed" color="error" variant="subtle">失败 {{ result.failed }}</UBadge>
        <span class="text-sm text-muted">共 {{ result.total }} 篇</span>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div class="space-y-2">
          <div
            v-for="(detail, index) in result.details"
            :key="index"
            class="flex items-start gap-3 rounded-lg border p-3 dark:border-zinc-800"
          >
            <UIcon
              :name="detail.status === 'created' ? 'i-heroicons-check-circle' : detail.status === 'skipped' ? 'i-heroicons-arrow-path' : 'i-heroicons-x-circle'"
              :class="detail.status === 'created' ? 'text-green-500' : detail.status === 'skipped' ? 'text-yellow-500' : 'text-red-500'"
              class="mt-0.5 h-5 w-5 shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ detail.title }}</p>
              <p class="text-sm text-muted">{{ detail.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { SyncResult } from "~/types/csdn-sync"

interface CsdnArticle {
  articleId: string
  title: string
  postTime: string
  viewCount: number
  exists: boolean
}

definePageMeta({ layout: "admin", middleware: "admin-auth" })

const toast = useToast()
const fetching = ref(false)
const fetchError = ref("")
const articles = ref<CsdnArticle[]>([])
const selectedIds = ref<string[]>([])
const selectAll = ref(false)
const syncing = ref(false)
const syncError = ref("")
const result = ref<SyncResult | null>(null)

async function fetchList() {
  if (fetching.value) return
  fetching.value = true
  fetchError.value = ""
  articles.value = []
  selectedIds.value = []
  selectAll.value = false
  result.value = null

  try {
    const res = await $fetch<{ code: number, data: CsdnArticle[] }>("/api/csdn/list", {
      method: "POST",
      timeout: 30000
    })
    articles.value = res.data
    toast.add({ title: `获取成功，共 ${res.data.length} 篇文章`, color: "success" })
  } catch (e) {
    const err = e as { data?: { message?: string }, message?: string }
    fetchError.value = err.data?.message || err.message || "获取文章列表失败"
  } finally {
    fetching.value = false
  }
}

function toggleSelect(articleId: string) {
  const index = selectedIds.value.indexOf(articleId)
  if (index === -1) {
    selectedIds.value.push(articleId)
  } else {
    selectedIds.value.splice(index, 1)
  }
  selectAll.value = selectedIds.value.length === articles.value.length
}

function toggleSelectAll(checked: boolean | "indeterminate") {
  if (checked === true) {
    selectedIds.value = articles.value.filter(a => !a.exists).map(a => a.articleId)
  } else {
    selectedIds.value = []
  }
}

async function syncSelected() {
  if (selectedIds.value.length === 0 || syncing.value) return
  syncing.value = true
  syncError.value = ""
  result.value = null

  try {
    const res = await $fetch<SyncResult>("/api/csdn/sync", {
      method: "POST",
      body: { articles: selectedIds.value.map(id => {
        const a = articles.value.find(x => x.articleId === id)
        return { id, postTime: a?.postTime || "", viewCount: a?.viewCount || 0 }
      }) },
      timeout: 300000
    })
    result.value = res
    toast.add({
      title: `同步完成：新增 ${res.created} 篇，跳过 ${res.skipped} 篇`,
      color: res.failed > 0 ? "warning" : "success"
    })
  } catch (e) {
    const err = e as { data?: { message?: string }, message?: string }
    syncError.value = err.data?.message || err.message || "同步失败，请重试"
  } finally {
    syncing.value = false
  }
}
</script>
