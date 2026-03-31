<template>
  <article class="container">
    <UContainer v-if="article">
      <UPageHeader :title="article.title" :description="article.description">
        <template #headline>
          <UBadge :label="article.category.name" variant="subtle" />
          <span class="text-muted">&middot;</span>
          <time class="text-muted">
            {{ formatDateForDisplay(article.publish_time) }}
          </time>
          <span class="text-muted">&middot;</span>
          <span class="text-muted">{{ readingTime }}</span>
        </template>

        <div class="flex flex-wrap items-center gap-3 mt-4">
          <UButton color="neutral" variant="subtle" size="sm">
            <UAvatar :src="article.cover" alt="Author avatar" size="2xs" />
            {{ article.author }}
          </UButton>
        </div>

        <div class="flex flex-wrap items-center gap-2 mt-3">
          <UBadge v-for="tag in article.tags" :key="tag.id" :label="tag.name" variant="soft" />
        </div>
      </UPageHeader>

      <UPage>
        <UPageBody>
          <ContentRenderer :value="ast" />

          <div class="mt-12 pt-8 border-t">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NuxtLink
                v-if="neighbors.prev"
                :to="`/article/${neighbors.prev.uuid}`"
                class="group flex flex-col gap-1 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-all"
              >
                <span class="text-xs text-muted-foreground">上一篇</span>
                <span class="font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {{ neighbors.prev.title }}
                </span>
              </NuxtLink>
              <div v-else />

              <NuxtLink
                v-if="neighbors.next"
                :to="`/article/${neighbors.next.uuid}`"
                class="group flex flex-col gap-1 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-all text-right"
              >
                <span class="text-xs text-muted-foreground">下一篇</span>
                <span class="font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {{ neighbors.next.title }}
                </span>
              </NuxtLink>
              <div v-else />
            </div>
          </div>
        </UPageBody>

        <template v-if="ast?.toc?.links?.length" #right>
          <div class="hidden lg:block">
            <ArticleToc :toc="ast.toc" />
          </div>
        </template>
      </UPage>
    </UContainer>
  </article>
</template>

<script setup lang="ts">
import type { IArticle } from "~/types/article"

const route = useRoute()
const slug = route.params.slug as string

const article = ref<IArticle | null>(null)

// 获取文章详情
const { data } = await useAsyncData(`article-${slug}`, () =>
  http({
    url: `/v1/posts/${slug}`
  })
)
article.value = data.value || {}
const ast = await parseMarkdown(data.value?.content || "")

// 阅读时长估算（中文按 400 字/分钟）
const readingTime = computed(() => {
  const content = article.value?.content || ""
  const charCount = content.replace(/\s/g, "").length
  const minutes = Math.max(1, Math.ceil(charCount / 400))
  return `约 ${minutes} 分钟读完`
})

// 获取上下篇文章
const neighbors = ref<{ prev: { uuid: string; title: string } | null; next: { uuid: string; title: string } | null }>({
  prev: null,
  next: null
})

try {
  const { data: listData } = await useAsyncData(`article-list-${slug}`, () =>
    http<{ data: { uuid: string; title: string }[] }>({
      url: `/v1/posts?page=1&limit=200`
    })
  )

  const list = listData.value?.data || []
  const currentIndex = list.findIndex((item) => item.uuid === slug)

  if (currentIndex > 0) {
    neighbors.value.prev = list[currentIndex - 1]
  }
  if (currentIndex >= 0 && currentIndex < list.length - 1) {
    neighbors.value.next = list[currentIndex + 1]
  }
} catch {
  // 上下篇获取失败不影响文章展示
}
</script>

<style lang="scss" scoped></style>
