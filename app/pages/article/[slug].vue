<template>
  <article class="container">
    <div class="fixed inset-x-0 top-0 z-50 h-1 bg-primary transition-[width]" :style="{ width: `${readingProgress}%` }" aria-hidden="true" />
    <UContainer v-if="article">
      <UPageHeader :title="article.title" :description="article.description">
        <template #headline>
          <UBadge :label="article.category?.name || '未分类'" variant="subtle" />
          <span class="text-muted">&middot;</span>
          <time class="text-muted">
            {{ formatDateForDisplay(article.publish_time) }}
          </time>
          <span class="text-muted">&middot;</span>
          <span class="text-muted">{{ readingTime }}</span>
          <span class="text-muted">&middot;</span>
          <span class="text-muted">{{ article.views || 0 }} 次观看</span>
        </template>

        <div class="flex flex-wrap items-center gap-3 mt-4">
          <UButton color="neutral" variant="subtle" size="sm">
            <UAvatar :src="article.author_avatar || '/api/v1/users/default-avatar.webp?v=3'" :alt="`${article.author} 的头像`" size="2xs" />
            {{ article.author }}
          </UButton>
        </div>

        <div class="flex flex-wrap items-center gap-2 mt-3">
          <UBadge
            v-for="tag in article.tags"
            :key="tag.id"
            :label="tag.name"
            variant="soft"
          />
        </div>
      </UPageHeader>

      <UPage>
        <UPageBody class="space-y-6">
          <MDCRenderer v-if="ast" :body="ast.body" :data="ast.data" :components="proseComponents" />

          <section v-if="relatedPosts.length" class="border-t pt-8" aria-label="相关文章">
            <div class="mb-4 flex items-center justify-between"><h2 class="text-xl font-semibold">相关文章</h2><NuxtLink :to="`/blog/1?category=${article?.category?.id}`" class="text-sm text-primary">查看同分类文章</NuxtLink></div>
            <div class="grid gap-3 sm:grid-cols-2"><NuxtLink v-for="post in relatedPosts" :key="post.uuid" :to="`/article/${post.uuid}`" class="rounded-lg border p-4 transition hover:border-primary hover:bg-muted/30"><p class="line-clamp-1 font-medium">{{ post.title }}</p><p class="mt-1 line-clamp-2 text-sm text-muted">{{ post.description }}</p><p class="mt-2 text-xs text-muted">{{ post.views || 0 }} 浏览</p></NuxtLink></div>
          </section>
          <section class="rounded-xl border bg-muted/20 p-5" aria-label="读者反馈">
            <h2 class="font-semibold">这篇文章对你有帮助吗？</h2>
            <div class="mt-3 flex flex-wrap gap-2"><UButton size="sm" variant="soft" :loading="feedbackSending" @click="sendFeedback('helpful')">有帮助</UButton><UButton size="sm" color="neutral" variant="soft" :loading="feedbackSending" @click="sendFeedback('not_helpful')">需要改进</UButton><UButton size="sm" color="neutral" variant="ghost" @click="showFeedback = !showFeedback">留下建议</UButton></div>
            <div v-if="showFeedback" class="mt-4 space-y-3"><UTextarea v-model="feedbackMessage" placeholder="告诉我哪里还可以改进" :rows="3" maxlength="2000" /><UButton size="sm" :loading="feedbackSending" @click="sendFeedback('message')">提交反馈</UButton></div>
          </section>

          <div class="mt-12 pt-8 border-t">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NuxtLink
                v-if="neighbors.prev"
                :to="`/article/${neighbors.prev.uuid}`"
                class="group flex flex-col gap-1 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-all"
              >
                <span class="text-xs text-muted-foreground">上一篇</span>
                <span
                  class="font-medium group-hover:text-primary transition-colors line-clamp-1"
                >
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
                <span
                  class="font-medium group-hover:text-primary transition-colors line-clamp-1"
                >
                  {{ neighbors.next.title }}
                </span>
              </NuxtLink>
              <div v-else />
            </div>
          </div>
        </UPageBody>

        <template #right>
          <UPageAside>
            <ArticleToc :toc="articleToc" />
          </UPageAside>
        </template>
      </UPage>
    </UContainer>
  </article>
</template>

<script setup lang="ts">
import type { ArticlePage } from "~/types/article"
import MDCRenderer from "@nuxtjs/mdc/runtime/components/MDCRenderer.vue"
import ProsePre from "~/components/ProsePre.vue"

const proseComponents = { pre: ProsePre, ProsePre }

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
const pageUrl = computed(() => `${siteUrl}/article/${encodeURIComponent(slug.value)}`)
const { data, error } = await useAsyncData(() => `article:${slug.value}`, (_app, { signal }) =>
  http<ArticlePage>({ url: `/public/articles/${encodeURIComponent(slug.value)}`, signal })
)
if (error.value) throw publicPageError(error.value)
if (!data.value) throw createError({ statusCode: 404, statusMessage: "Article not found" })
watch(error, value => { if (value) showError(publicPageError(value)) })
async function recordView() {
  if (!import.meta.client) return
  await http({ url: `/v1/posts/${encodeURIComponent(slug.value)}/view`, method: "POST", timeout: 3000 }).catch(() => {})
}
onMounted(() => { void recordView(); updateReadingProgress(); window.addEventListener("scroll", updateReadingProgress, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener("scroll", updateReadingProgress))
watch(slug, () => { void recordView() })
const article = computed(() => data.value?.article)
const ast = computed(() => data.value?.ast)
const { data: relatedResponse } = await useAsyncData(() => `related:${slug.value}:${article.value?.category?.id || 0}`, (_app, { signal }) => article.value?.category?.id ? http<{ data: Array<{ uuid: string, title: string, description: string, views?: number }> }>({ url: "/public/posts", query: { page: 1, limit: 8, category: article.value.category.id }, signal }) : Promise.resolve(null))
const relatedPosts = computed(() => (relatedResponse.value?.data || []).filter(post => post.uuid !== slug.value).slice(0, 4))

type TocLink = {
  id: string
  text: string
  depth: number
}

function textFromNode(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const value = node as { value?: unknown; children?: unknown[] }
  if (typeof value.value === "string") return value.value
  return (value.children || []).map(textFromNode).join("")
}

const fallbackTocLinks = computed<TocLink[]>(() => {
  const children = ast.value?.body?.children || []
  return children.flatMap((node: unknown) => {
    if (!node || typeof node !== "object") return []
    const heading = node as {
      tag?: string
      props?: { id?: string }
      children?: unknown[]
    }
    const depth = Number(heading.tag?.slice(1))
    const id = heading.props?.id
    const text = textFromNode(heading)
    return /^h[1-6]$/.test(heading.tag || "") && id && text
      ? [{ id, text, depth }]
      : []
  })
})

const articleToc = computed(() => {
  const links = ast.value?.toc?.links
  return { links: links?.length ? links : fallbackTocLinks.value }
})
const neighbors = computed(() => data.value?.neighbors || { prev: null, next: null })
const readingTime = computed(() => `约 ${data.value?.readingMinutes || 1} 分钟读完`)
const readingProgress = ref(0)
const feedbackSending = ref(false)
const feedbackMessage = ref("")
const showFeedback = ref(false)
const toast = useToast()
function updateReadingProgress() { const max = document.documentElement.scrollHeight - window.innerHeight; readingProgress.value = max > 0 ? Math.min(100, Math.max(0, Math.round(window.scrollY / max * 100))) : 0 }
async function sendFeedback(kind: "helpful" | "not_helpful" | "message") {
  if (kind === "message" && !feedbackMessage.value.trim()) { toast.add({ title: "请先填写反馈内容", color: "warning" }); return }
  feedbackSending.value = true
  try { await http({ url: "/v1/feedback", method: "POST", body: { kind, post_uuid: slug.value, message: kind === "message" ? feedbackMessage.value.trim() : undefined } }); toast.add({ title: "感谢你的反馈", color: "success" }); feedbackMessage.value = ""; showFeedback.value = false } catch { toast.add({ title: "提交失败，请稍后重试", color: "error" }) } finally { feedbackSending.value = false }
}

const seoTitle = computed(() => `${article.value?.title || "文章详情"} | 朝阳的码农札记`)
const seoDescription = computed(() => article.value?.description || "技术文章详情页。")
const seoImage = computed(() => article.value?.cover || `${siteUrl}/blog.webp`)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: "article",
  ogUrl: pageUrl,
  ogImage: seoImage,
  twitterCard: "summary_large_image",
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
  robots: "index, follow"
})

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": article.value?.title || "文章详情",
        "description": seoDescription.value,
        "image": [seoImage.value],
        "datePublished": article.value?.publish_time
          ? new Date(article.value.publish_time).toISOString()
          : undefined,
        "dateModified": article.value?.publish_time
          ? new Date(article.value.publish_time).toISOString()
          : undefined,
        "author": {
          "@type": "Person",
          "name": article.value?.author || "朝阳"
        },
        "publisher": {
          "@type": "Organization",
          "name": "朝阳的码农札记",
          "logo": {
            "@type": "ImageObject",
            "url": `${siteUrl}/favicon.ico`
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": pageUrl.value
        },
        "articleSection": article.value?.category?.name || "技术文章",
        "keywords":
          article.value?.tags?.map((tag) => tag.name).join(",") || undefined
      })
    },
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "首页",
            "item": siteUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "文章",
            "item": `${siteUrl}/blog/1`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": article.value?.title || "文章详情",
            "item": pageUrl.value
          }
        ]
      })
    }
  ],
  link: [
    {
      rel: "canonical",
      href: pageUrl.value
    }
  ]
}))

</script>
