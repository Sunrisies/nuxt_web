<template>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto max-w-3xl px-4 py-8">
      <h1 class="text-3xl font-bold mb-2">
        文章归档
      </h1>
      <p class="text-sm text-muted-foreground mb-8">
        共 {{ totalArticles }} 篇文章
      </p>

      <div
        v-for="group in groupedArticles"
        :key="group.year"
        class="mb-10"
      >
        <div class="flex items-center gap-3 mb-4 sticky top-0 bg-background py-2 z-10">
          <h2 class="text-2xl font-bold">
            {{ group.year }}
          </h2>
          <span class="text-sm text-muted-foreground">{{ group.months.reduce((s, m) => s + m.articles.length, 0) }} 篇</span>
        </div>

        <div
          v-for="month in group.months"
          :key="`${group.year}-${month.month}`"
          class="mb-6 ml-4"
        >
          <h3 class="text-sm font-semibold text-muted-foreground mb-3 pl-4 border-l-2 border-primary/30">
            {{ month.month }} 月
          </h3>

          <div class="space-y-1">
            <NuxtLink
              v-for="article in month.articles"
              :key="article.uuid"
              :to="`/article/${article.uuid}`"
              class="group flex items-center gap-3 py-2 px-4 rounded-md hover:bg-muted/50 transition-colors"
            >
              <span class="text-xs text-muted-foreground shrink-0 w-12">
                {{ formatDay(article.publish_time) }}
              </span>
              <span class="truncate group-hover:text-primary transition-colors">
                {{ article.title }}
              </span>
              <UBadge
                v-if="article.is_top"
                label="置顶"
                variant="subtle"
                size="sm"
                class="shrink-0"
              />
            </NuxtLink>
          </div>
        </div>
      </div>
      <UAlert v-if="loadError" class="mb-4" color="warning" :title="loadError" />
      <div v-if="articles.length < totalArticles" class="flex justify-center">
        <UButton :loading="loadingMore" @click="loadMore">加载更多文章</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PostList, PostSummary } from "~/types/blog"

useHead({
  title: "文章归档 | 朝阳的码农札记",
  meta: [
    { name: "description", content: "按时间线浏览所有技术文章，按年月分组整理。" }
  ]
})

const { data, error } = await useAsyncData("archives:first", (_app, { signal }) =>
  http<PostList>({ url: "/public/posts", query: { page: 1, limit: 100 }, signal })
)
if (error.value) throw publicPageError(error.value)
const articles = ref<PostSummary[]>(data.value?.data || [])
const nextPage = ref(2)
const loadingMore = ref(false)
const loadError = ref("")
async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  loadError.value = ""
  try {
    const result = await http<PostList>({ url: "/public/posts", query: { page: nextPage.value, limit: 100 } })
    if (!result.data.length) throw new Error("归档数据暂时不完整，请稍后重试")
    const existing = new Set(articles.value.map(article => article.uuid))
    articles.value.push(...result.data.filter(article => !existing.has(article.uuid)))
    nextPage.value++
  } catch {
    loadError.value = "更多文章暂时无法加载，请重试"
  } finally {
    loadingMore.value = false
  }
}
const totalArticles = computed(() => data.value?.pagination.total || 0)

interface MonthGroup {
  month: number
  articles: PostSummary[]
}

interface YearGroup {
  year: number
  months: MonthGroup[]
}

const groupedArticles = computed<YearGroup[]>(() => {
  const map = new Map<number, Map<number, PostSummary[]>>()

  for (const article of articles.value) {
    const date = new Date(article.publish_time)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    if (!map.has(year)) map.set(year, new Map())
    const monthMap = map.get(year)!
    if (!monthMap.has(month)) monthMap.set(month, [])
    monthMap.get(month)!.push(article)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, monthMap]) => ({
      year,
      months: Array.from(monthMap.entries())
        .sort(([a], [b]) => b - a)
        .map(([month, arts]) => ({
          month,
          articles: arts.sort((a, b) => new Date(b.publish_time).getTime() - new Date(a.publish_time).getTime())
        }))
    }))
})

function formatDay(dateString: string): string {
  const d = new Date(dateString)
  return String(d.getDate()).padStart(2, "0") + "日"
}
</script>
