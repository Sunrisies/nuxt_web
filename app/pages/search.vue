<template><UContainer class="py-8 sm:py-12"><UPageHeader title="搜索文章" :description="keyword ? `“${keyword}” 的搜索结果` : '输入关键词，搜索文章标题与摘要。'" /><form class="mt-8 flex gap-2" @submit.prevent="submit"><UInput v-model="input" autofocus aria-label="搜索文章" placeholder="输入关键词" :maxlength="100" class="flex-1" /><UButton type="submit" :disabled="!input.trim()">搜索</UButton></form><div v-if="keyword" class="mt-8"><p class="mb-4 text-sm text-muted">找到 {{ result?.pagination.total || 0 }} 篇文章</p><div v-if="result?.data.length" class="space-y-4"><NuxtLink v-for="post in result.data" :key="post.uuid" :to="`/article/${post.uuid}`" class="block rounded-xl border p-5 transition hover:border-primary hover:bg-muted/30"><h2 class="font-semibold text-highlighted">{{ post.title }}</h2><p class="mt-2 line-clamp-2 text-sm text-muted">{{ post.description }}</p><div class="mt-3 text-xs text-muted">{{ post.category?.name || '未分类' }} · {{ formatDateForDisplay(post.publish_time) }} · {{ post.views || 0 }} 浏览</div></NuxtLink></div><p v-else class="rounded-lg border border-dashed p-10 text-center text-muted">没有找到匹配文章，换个关键词试试。</p></div></UContainer></template>
<script setup lang="ts">
import type { PostList } from "~/types/blog"
const route = useRoute(); const router = useRouter()
const keyword = computed(() => typeof route.query.q === "string" ? route.query.q.trim().slice(0, 100) : "")
const input = ref(keyword.value)
const { data: result, error } = await useAsyncData(() => `search:${keyword.value}`, (_app, { signal }) => keyword.value ? http<PostList>({ url: "/public/posts", query: { page: 1, limit: 50, search: keyword.value }, signal }) : Promise.resolve(null))
if (error.value) throw publicPageError(error.value)
function submit() { const q = input.value.trim(); if (q) return router.push({ path: "/search", query: { q } }) }
watch(() => route.query.q, value => { input.value = typeof value === "string" ? value : "" })
useSeoMeta({ title: computed(() => keyword.value ? `搜索：${keyword.value}` : "搜索文章"), robots: "noindex, follow" })
</script>
