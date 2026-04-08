<template>
  <div
    class="min-h-screen flex flex-col bg-linear-to-br from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-zinc-800 transition-colors duration-300"
  >
    <!-- 头部区域 - 固定 -->
    <header
      class="fixed top-16 left-0 right-0 z-100 bg-linear-to-r from-blue-500 to-indigo-600 dark:from-zinc-800 dark:to-zinc-900 py-3 px-5 text-center text-white dark:text-gray-100 overflow-hidden transition-colors duration-300"
    >
      <div class="relative z-10">
        <h1 class="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-shadow">导航中心</h1>
        <p class="text-xs sm:text-sm opacity-90">发现优质工具，提升工作效率</p>
      </div>
      <!-- 搜索框 -->
      <div class="relative max-w-2xl mx-auto z-10 mt-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索导航..."
          class="w-full py-3 pl-4 pr-12 rounded-full text-sm shadow-md transition-all duration-300 focus:outline-none focus:shadow-lg placeholder-gray-400 bg-white dark:bg-zinc-700 dark:text-white"
        />
        <span
          class="absolute right-5 top-1/2 transform -translate-y-1/2 text-indigo-500 dark:text-indigo-400 pointer-events-none transition-colors duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
      </div>
    </header>

    <!-- 导航内容 -->
    <div
      class="px-5 py-2 relative z-20 grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[240px_1fr] gap-8 items-start mt-40 h-[calc(100vh-160px)]"
    >
      <!-- 左侧分类导航 - 固定 -->
      <aside
        class="sticky top-56 bg-white dark:bg-zinc-800 rounded-2xl p-1.5 shadow-sm h-fit hidden lg:block transition-colors duration-300"
      >
        <div class="flex flex-col gap-1">
          <a
            v-for="category in filteredCategories"
            :key="category.id"
            :href="`#category-${category.id}`"
            class="flex items-center gap-3 px-2 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 transition-all duration-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-indigo-500"
            :class="{ 'bg-linear-to-r from-indigo-500 to-purple-600 text-white': activeCategory === category.id }"
            @click.prevent="scrollToCategory(category.id)"
          >
            <span
              class="w-8 h-8 bg-gray-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0 transition-all duration-300"
              :class="{ 'bg-white/20': activeCategory === category.id }"
            >
              {{ category.name.charAt(0) }}
            </span>
            <span class="flex-1 text-sm font-medium truncate">{{ category.name }}</span>
            <span
              class="text-xs text-gray-400 dark:text-gray-500 px-2.5 py-1 bg-gray-100 dark:bg-zinc-700 rounded-lg font-medium transition-all duration-300"
              :class="{ 'bg-white/20 text-white': activeCategory === category.id }"
            >
              {{ category.items.length }}
            </span>
          </a>
        </div>
      </aside>

      <!-- 右侧内容区域 - 可滚动 -->
      <main
        class="min-w-0 overflow-y-auto h-full pr-2 scrollbar-thin scrollbar-thumb-indigo-500/20 hover:scrollbar-thumb-indigo-500/30 lg:pr-2"
      >
        <div v-for="category in filteredCategories" :key="category.id" class="category-section mb-10 last:mb-0">
          <div class="flex items-center justify-between mb-5 px-2">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <span
                class="w-9 h-9 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center font-semibold text-lg"
              >
                {{ category.name.charAt(0) }}
              </span>
              {{ category.name }}
            </h2>
            <span class="text-sm text-gray-400 dark:text-gray-500 px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full">
              {{ category.items.length }} 个
            </span>
          </div>
          <div class="grid grid-cols-1 xs:grid-cols-2 tb:grid-cols-3 pc:grid-cols-6 gap-4">
            <a
              v-for="item in category.items"
              :key="item.id"
              :href="item.url"
              target="_blank"
              class="group flex items-center p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border-2 border-transparent relative overflow-hidden opacity-0 animate-slide-in hover:-translate-y-1 hover:shadow-lg hover:border-indigo-500/20 transition-all duration-300"
            >
              <div
                class="absolute bottom-0 left-0 right-0 h-0.75 bg-linear-to-r from-indigo-500 to-purple-600 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
              ></div>
              <div class="w-14 h-14 shrink-0 mr-4">
                <img
                  v-if="item.icon"
                  :src="item.icon"
                  :alt="item.name"
                  class="w-full h-full rounded-xl object-contain p-1 bg-gray-100 dark:bg-zinc-700"
                />
                <span
                  v-else
                  class="w-full h-full flex items-center justify-center bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-2xl font-semibold"
                >
                  {{ item.name.charAt(0) }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5 truncate">{{ item.name }}</h3>
                <p v-if="item.description" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {{ item.description }}
                </p>
              </div>
              <div
                class="opacity-0 -translate-x-2 transition-all duration-300 text-indigo-500 flex-shrink-0 group-hover:opacity-100 group-hover:translate-x-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </a>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div v-if="filteredCategories.length === 0" class="text-center py-20 text-gray-400 dark:text-gray-500">
          <div class="text-5xl mb-4">🔍</div>
          <p>没有找到相关内容</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
interface NavItem {
  id: number
  name: string
  url: string
  description: string
  categoryId: number
  icon: string
}

interface Category {
  id: number
  name: string
  items: NavItem[]
}

const { data } = await useFetch<NavItem[]>("/api/navigationBar")
// 搜索查询
const searchQuery = ref("")

// 当前激活的分类
const activeCategory = ref<number | null>(null)

// 分类映射
const categoryMap: Record<number, string> = {
  3: "工具软件",
  4: "开发框架",
  6: "AI工具",
  7: "运营工具",
  10: "其他"
}

// 按分类分组数据
const categories = computed(() => {
  if (!data.value) return []

  const grouped: Record<number, NavItem[]> = {}

  data.value.data.forEach((item) => {
    if (!grouped[item.categoryId]) {
      grouped[item.categoryId] = []
    }
    grouped[item.categoryId].push(item)
  })

  return Object.entries(grouped).map(([id, items]) => ({
    id: Number(id),
    name: categoryMap[Number(id)] || `分类 ${id}`,
    items
  }))
})

// 过滤分类
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value

  const query = searchQuery.value.toLowerCase()

  return categories.value
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
      )
    }))
    .filter((category) => category.items.length > 0)
})

// 滚动到指定分类
const scrollToCategory = (categoryId: number) => {
  const element = document.getElementById(`category-${categoryId}`)
  if (element) {
    const offset = 20 // 顶部留白
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    window.scrollTo({
      top: elementPosition - offset,
      behavior: "smooth"
    })
  }
}

// 监听滚动，更新激活的分类
onMounted(() => {
  const handleScroll = () => {
    const sections = document.querySelectorAll(".category-section")
    let currentSection = null

    sections.forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top
      const sectionHeight = section.clientHeight
      if (sectionTop <= 100) {
        currentSection = section.id.replace("category-", "")
      }
    })

    if (currentSection) {
      activeCategory.value = Number(currentSection)
    }
  }

  window.addEventListener("scroll", handleScroll)
  onUnmounted(() => {
    window.removeEventListener("scroll", handleScroll)
  })
})
</script>

<style>
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.5s ease forwards;
}
</style>
