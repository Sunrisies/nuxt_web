<template>
  <UHeader>
    <template #title>
      <div class="flex items-center gap-2 mr-4">
        <ClientOnly
          fallback-tag="span"
          fallback="Loading comments..."
        >
          <NuxtLink
            href="/"
            class="flex items-center gap-2"
          >
            <span class="text-lg font-bold">中文博客</span>
          </NuxtLink>
        </ClientOnly>
      </div>
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
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

      <UTooltip
        text="Open on GitHub"
        :kbds="['meta', 'G']"
      >
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

  <LoginModal v-model:open="showLogin" />
</template>

<script setup lang="ts">
const router = useRouter()
const loggedIn = ref(false)
const showLogin = ref(false)

const items = [
  { label: "首页", to: "/" },
  { label: "文章", to: "/blog/1" },
  { label: "归档", to: "/archives" },
  { label: "时光轴", to: "/timeline" },
  { label: "导航", to: "/navigationBar" },
  { label: "关于", to: "/about" }
]

onMounted(() => {
  loggedIn.value = !!localStorage.getItem("admin_user")
})

function handleLogout() {
  localStorage.removeItem("admin_user")
  loggedIn.value = false
  router.push("/")
}
</script>

<style lang="scss" scoped></style>
