<template>
  <div class="min-h-screen flex bg-gray-50 dark:bg-zinc-900">
    <!-- 移动端遮罩 -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- 侧边栏 -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-60 transform border-r bg-white dark:border-zinc-800 dark:bg-zinc-950 transition-transform duration-200 lg:static lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-16 items-center gap-3 border-b px-6 dark:border-zinc-800">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          B
        </div>
        <span class="text-lg font-semibold">管理后台</span>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto p-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="isActive(item.to) ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800'"
          @click="sidebarOpen = false"
        >
          <UIcon :name="item.icon" class="h-5 w-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="border-t p-4 dark:border-zinc-800">
        <button
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
          @click="handleLogout"
        >
          <UIcon name="i-heroicons-arrow-left-end-on-rectangle" class="h-5 w-5" />
          退出登录
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="flex flex-1 flex-col min-w-0">
      <!-- 顶部栏 -->
      <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <button
          class="lg:hidden"
          @click="sidebarOpen = true"
        >
          <UIcon name="i-heroicons-bars-3" class="h-6 w-6" />
        </button>

        <div class="flex-1" />

        <span class="text-sm text-gray-500">管理员</span>
      </header>

      <!-- 页面内容 -->
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

const navItems = [
  { label: "仪表盘",  icon: "i-heroicons-home",          to: "/admin/dashboard" },
  { label: "文章管理", icon: "i-heroicons-document-text", to: "/admin/posts" },
  { label: "分类管理", icon: "i-heroicons-tag",           to: "/admin/categories" },
  { label: "标签管理", icon: "i-heroicons-hashtag",       to: "/admin/tags" },
  { label: "链接管理", icon: "i-heroicons-link",          to: "/admin/links" },
]

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + "/")
}

function handleLogout() {
  localStorage.removeItem("admin_user")
  router.push("/")
}
</script>
