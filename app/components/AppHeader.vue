<template>
  <UHeader>
    <template #title>
      <div class="flex items-center gap-2 mr-4">
          <span class="text-lg font-bold">中文博客</span>
      </div>
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UButton color="neutral" variant="ghost" icon="i-heroicons-magnifying-glass" aria-label="搜索文章" @click="showSearch = true" />
      <ThemeToggle />

      <ClientOnly>
        <template v-if="loggedIn">
          <UTooltip text="进入后台">
            <UButton
              color="neutral"
              variant="ghost"
              to="/admin/dashboard"
              icon="i-heroicons-shield-check"
              aria-label="后台"
            />
          </UTooltip>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-right-end-on-rectangle"
            aria-label="退出"
            @click="handleLogout"
          />
        </template>
        <template v-else>
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            @click="showLogin = true"
          >
            登录
          </UButton>
        </template>
      </ClientOnly>

      <UTooltip text="Open on GitHub" :kbds="['meta', 'G']">
        <UButton
          color="neutral"
          variant="ghost"
          to="https://github.com/Sunrisies"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
        />
      </UTooltip>
    </template>
  </UHeader>

  <LazyLoginModal v-if="showLogin" v-model:open="showLogin" />
  <UModal v-model:open="showSearch" title="搜索文章"><template #body><form class="flex gap-2" @submit.prevent="submitSearch"><UInput v-model="search" autofocus aria-label="搜索关键词" placeholder="输入标题或摘要关键词" :maxlength="100" class="flex-1" /><UButton type="submit" :disabled="!search.trim()">搜索</UButton></form></template></UModal>
</template>

<script setup lang="ts">
const router = useRouter()
const { loggedIn, check, logout } = useAdminSession()
const toast = useToast()
const showLogin = ref(false)
const showSearch = ref(false)
const search = ref("")

const items = [
  { label: "首页", to: "/" },
  { label: "文章", to: "/blog/1" },
  { label: "归档", to: "/archives" },
  { label: "时光轴", to: "/timeline" },
  { label: "导航", to: "/navigationBar" },
  { label: "临时文件箱", to: "/clipboard" },
  { label: "关于", to: "/about" }
]

onMounted(() => {
  void check().catch(() => {})
})

async function handleLogout() {
  try {
    await logout()
    await router.push("/")
  } catch {
    toast.add({ title: "退出失败，请重试", color: "error" })
  }
}
async function submitSearch() { const q = search.value.trim(); if (!q) return; showSearch.value = false; await router.push({ path: "/search", query: { q } }) }
</script>

<style lang="scss" scoped></style>
