<template>
  <div class="container mx-auto px-4 py-4">
    <div class="flex justify-between">
      <h1 class="text-3xl font-bold mb-4">文章列表</h1>
      <!-- 桌面端分类/标签筛选 -->
      <div class="hidden md:flex justify-between items-center mb-4">
        
        <div class="flex space-x-4">
          <USelect
            v-model="selectedCategory"
            :items="categoryOptions"
            placeholder="所有分类"
          />
          <USelect
            v-model="selectedTag"
            :items="tagOptions"
            placeholder="所有标签"
            class="w-48"
          />
        </div>
      </div>
    </div>

    <h2 class="text-2xl font-semibold mb-2">最新文章</h2>

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
            day: 'numeric',
          })
        "
        :authors="post.authors"
        :badge="post.badge"
        :orientation="index === 0 ? 'horizontal' : 'vertical'"
        :class="[index === 0 && 'col-span-full']"
        :ui="{
          description: 'line-clamp-2',
        }"
      />
    </UBlogPosts>

    <div class="mt-8 flex justify-center">
      <UPagination
        v-model:page="page"
        :items-per-page="pagination.limit"
        :total="pagination.total"
        @update:page="(page:number) => {
          console.log('挑战',page)
          navigateTo(`/blog/${page}` ,{ external: true })
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type {  IBlog } from "~/types/blog";
interface optionsType {
  label: string;
  value: string;
}
const props = defineProps<{
  blogs: IBlog[];
  categories: optionsType[];
  pagination: { total: number; limit: number };
  id: number;
  tags: optionsType[];
}>();
// 状态
const page = ref(props.id);
const selectedCategory = ref("all");
const selectedTag = ref("all");

// 分类选项
const categoryOptions = computed(() => [
  { label: "所有分类", value: "all" },
  ...props.categories.map((c) => ({ label: c.label, value: c.value })),
]);

console.log(categoryOptions.value,'分类');
// 标签选项（硬编码，与原代码保持一致）
const tagOptions = computed(() =>[
  { label: "所有标签", value: "all" },
  ...props.tags.map((t) => ({ label: t.label, value: t.value })),
])
</script>

<style scoped lang="scss">
:deep(.header) {
  border: 1px solid red;
}
</style>
