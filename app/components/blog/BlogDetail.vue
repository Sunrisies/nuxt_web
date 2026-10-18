<template>
  <div class="container mx-auto px-4 py-4">
    <div class="flex flex-col gap-2 md:flex-row md:justify-between">
      <h1 class="text-3xl font-bold mb-4">
        文章列表
      </h1>
      <!-- 筛选条件同步到 URL -->
      <div class="flex items-center mb-4">
        <div class="flex space-x-4">
          <USelect
            :model-value="category"
            aria-label="按分类筛选"
            :items="categoryOptions"
            placeholder="所有分类"
            @update:model-value="value => emit('filter', 'category', String(value))"
          />
          <USelect
            :model-value="tag"
            aria-label="按标签筛选"
            :items="tagOptions"
            placeholder="所有标签"
            class="w-48"
            @update:model-value="value => emit('filter', 'tag', String(value))"
          />
        </div>
      </div>
    </div>

    <h2 class="text-2xl font-semibold mb-2">
      最新文章
    </h2>

    <p v-if="!blogs.length" class="py-8 text-muted">当前筛选条件下没有文章。</p>

    <UBlogPosts
      class="flex w-full flex-col gap-8 lg:gap-y-16 sm:grid sm:grid-cols-2 pc:grid-cols-4"
    >
      <UBlogPost
        v-for="(post, index) in blogs"
        :key="post.uuid"
        :to="post.path"
        :title="post.title"
        :description="post.description"
        :image="post.image"
        :date="
          new Date(post.date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        "
        :authors="post.authors"
        :badge="post.badge"
        :orientation="index === 0 ? 'horizontal' : 'vertical'"
        :class="[index === 0 && 'col-span-full']"
        :ui="{
          description: 'line-clamp-2'
        }"
      />
    </UBlogPosts>

    <div class="mt-8 flex justify-center">
      <UPagination
        :page="id"
        :to="value => ({ path: `/blog/${value}`, query: filterQuery })"
        :items-per-page="pagination.limit"
        :total="pagination.total"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface BlogCard {
  uuid: string
  path: string
  title: string
  description: string
  image: string
  date: string
  authors: { name: string }[]
  badge?: string
  views: number
}

interface optionsType {
  label: string
  value: string
}
const props = defineProps<{
  blogs: BlogCard[]
  categories: optionsType[]
  pagination: { total: number, limit: number }
  id: number
  tags: optionsType[]
  category: string
  tag: string
}>()
const emit = defineEmits<{ filter: [key: "category" | "tag", value: string] }>()
const filterQuery = computed(() => ({
  ...(props.category !== "all" ? { category: props.category } : {}),
  ...(props.tag !== "all" ? { tag: props.tag } : {})
}))

// 分类选项
const categoryOptions = computed(() => [
  { label: "所有分类", value: "all" },
  ...(props.categories || []).map(c => ({ label: c.label, value: c.value }))
])

// 标签选项
const tagOptions = computed(() => [
  { label: "所有标签", value: "all" },
  ...(props.tags || []).map(t => ({ label: t.label, value: t.value }))
])
</script>
