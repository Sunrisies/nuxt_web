<template>
  <div>
    <BlogDetail
      :id="Number(id)"
      :blogs="blogs"
      :pagination="pagination"
      :categories="categories"
      :tags="tags"
      :category="category"
      :tag="tag"
      @filter="setFilter"
    />
  </div>
</template>

<script setup lang="ts">
import type { PostList } from "~/types/blog"

const route = useRoute()
definePageMeta({
  validate: route => /^[1-9]\d*$/.test(String(route.params.slug))
    && [route.query.category, route.query.tag].every(value => value === undefined || (typeof value === "string" && /^[1-9]\d*$/.test(value)))
})
const id = computed(() => Number(route.params.slug))
const category = computed(() => typeof route.query.category === "string" ? route.query.category : "all")
const tag = computed(() => typeof route.query.tag === "string" ? route.query.tag : "all")
const filters = computed(() => ({
  ...(category.value !== "all" ? { category: category.value } : {}),
  ...(tag.value !== "all" ? { tag: tag.value } : {})
}))
function setFilter(key: "category" | "tag", value: string) {
  const query = { ...filters.value, [key]: value === "all" ? undefined : value }
  return navigateTo({ path: "/blog/1", query })
}
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
const pageUrl = computed(() => `${siteUrl}${route.path}${new URLSearchParams(filters.value).size ? `?${new URLSearchParams(filters.value)}` : ""}`)

const [{ data: postRes, error: postError }, { data: categoriesRes, error: categoriesError }, { data: tagsRes, error: tagsError }] = await Promise.all([
  useAsyncData(() => `posts:page:${id.value}:category:${category.value}:tag:${tag.value}`, (_app, { signal }) => http<PostList>({
    url: "/public/posts", query: { page: id.value, limit: 9, ...filters.value }, signal
  })),
  useAsyncData("categories:list", (_app, { signal }) => http<{ id: number, name: string }[]>({ url: "/public/categories", signal })),
  usePublicTags()
])
if (postError.value || categoriesError.value || tagsError.value) {
  throw publicPageError(postError.value || categoriesError.value || tagsError.value)
}
const blogs = computed(() => (postRes.value?.data || []).map(blog => ({
  uuid: blog.uuid,
  path: `/article/${blog.uuid}`,
  title: blog.title,
  description: blog.description,
  image: blog.cover,
  date: blog.publish_time,
  authors: [{ name: blog.author }],
  badge: blog.is_top ? "置顶" : blog.category?.name,
  views: blog.views
})))
const pagination = computed(() => postRes.value?.pagination || { total: 0, limit: 9, page: id.value })
const categories = computed(() => (categoriesRes.value || []).map(item => ({ value: String(item.id), label: item.name })))
const tags = computed(() => (tagsRes.value || []).map(item => ({ value: String(item.id), label: item.name })))
watch(postError, error => { if (error) showError(publicPageError(error)) })

const seoTitle = computed(() => `博客列表第 ${id.value} 页 | 朝阳的码农札记`)
const seoDescription = computed(() => `朝阳的码农札记博客分页列表，第 ${id.value} 页，包含最新技术文章与分类导航。`)
const seoImage = `${siteUrl}/blog.webp`

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: "website",
  ogUrl: pageUrl,
  ogImage: seoImage,
  twitterCard: "summary_large_image",
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
  robots: "index, follow"
})

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: pageUrl.value
    }
  ]
}))
</script>
