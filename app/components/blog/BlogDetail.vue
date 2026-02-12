<template>
  <div class="container mx-auto px-4 py-4">
    <div class="flex justify-between">
      <h1 class="text-3xl font-bold mb-4">文章列表</h1>
      <!-- 桌面端分类/标签筛选 -->
      <div class="hidden md:flex justify-between items-center mb-4">
        <div class="flex space-x-4">
          <USelectMenu
            v-model="selectedCategory"
            :options="categoryOptions"
            placeholder="所有分类"
            class="w-48"
          />
          <USelectMenu
            v-model="selectedTag"
            :options="tagOptions"
            placeholder="所有标签"
            class="w-48"
          />
        </div>
      </div>
    </div>

    <h2 class="text-2xl font-semibold mb-2">最新文章</h2>


  <UBlogPosts class="flex w-full flex-col gap-8 lg:gap-y-16 sm:grid sm:grid-cols-2 pc:grid-cols-4">
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
    <!-- </div> -->

    <!-- 移动端：加载更多（滚动触发） -->
    <div
      v-if="deviceType === 'mobile' && newArticles.length < pagination.total"
      ref="loadMoreTrigger"
      class="flex justify-center mt-8"
    >
      <UButton @click="loadMore" variant="outline">
        加载更多
      </UButton>
    </div>

    <!-- 桌面端：分页 -->
    <div v-if="deviceType === 'desktop'" class="mt-8 flex justify-center">
      <UPagination
        v-model="currentPage"
        :page-count="pagination.limit"
        :total="pagination.total"
        :max="5"
        @update:model-value="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoriesType, IBlog } from '~/types/blog'
import { useIntersectionObserver } from '@vueuse/core'

const props = defineProps<{
  blogs: IBlog[]
  categories: CategoriesType[]
  pagination: { total: number; limit: number }
  id: number
}>()

// 状态
const newArticles = ref<IBlog[]>(props.blogs)
const currentPage = ref(props.id)
const selectedCategory = ref('')
const selectedTag = ref('')
const deviceType = ref<'mobile' | 'tablet' | 'desktop'>('desktop')

// 设备类型检测（仅在客户端执行）
onMounted(() => {
  const checkDevice = () => {
    const width = window.innerWidth
    if (width < 640) deviceType.value = 'mobile'
    else if (width < 1024) deviceType.value = 'tablet'
    else deviceType.value = 'desktop'
  }
  checkDevice()
  window.addEventListener('resize', checkDevice)
  onUnmounted(() => window.removeEventListener('resize', checkDevice))
})

// 分类选项
const categoryOptions = computed(() => [
  { label: '所有分类', value: 'all' },
  ...props.categories.map(c => ({ label: c.label, value: c.value }))
])

// 标签选项（硬编码，与原代码保持一致）
const tagOptions = [
  { label: '所有标签', value: 'all' },
  { label: 'React', value: 'react' },
  { label: 'Next.js', value: 'nextjs' }
]

// ---------- 加载更多（移动端） ----------
const loadMoreTrigger = ref<HTMLElement | null>(null)

// 监听滚动到底部自动触发加载更多
if (process.client) {
  useIntersectionObserver(
    loadMoreTrigger,
    ([entry]) => {
      if (entry.isIntersecting && deviceType.value === 'mobile') {
        loadMore()
      }
    },
    { threshold: 0 }
  )
}

const loadMore = async () => {
  const nextPage = currentPage.value + 1
  try {
    const { data } = await $fetch<{ data: IBlog[] }>(
      `/api/article?page=${nextPage}&limit=8`
    )
    // 追加新数据
    newArticles.value = [...newArticles.value, ...data]
    currentPage.value = nextPage
  } catch (error) {
    console.error('加载更多失败', error)
  }
}

// ---------- 桌面端分页跳转 ----------
const onPageChange = (page: number) => {
  navigateTo(`/blog/${page}`)
}
</script>

<style scoped lang="scss" >
:deep(.header){
    border:1px solid red;
}
</style>