<template>
  <UHeader>
    <template #title>
      <div class="flex items-center gap-2 mr-4">
        <NuxtLink
          href="/"
          class="flex items-center gap-2"
        >
          <span class="text-lg font-bold">中文博客</span>
        </NuxtLink>
      </div>
      <Logo class="h-6 w-auto" />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton @click="handleTheme" />

      <UTooltip
        text="Open on GitHub"
        :kbds="['meta', 'G']"
      >
        <UButton
          color="neutral"
          variant="ghost"
          to="https://github.com/nuxt/ui"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
        />
      </UTooltip>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  { label: "Home", to: "/" },
  { label: "文章", to: "/blog/1" },
  // { label: '时光轴', to: '/timeline' },
  // {
  //   label: '影像长廊',
  //   to: '/album'
  // },
  // { label: '音乐库', to: '/music-player' },
  // { label: '第三方库', to: '/libraries' },
  // { label: '资源库', to: '/chat' },
  { label: "关于", to: "/about" }
])

const showSearch = ref(false)
const setShowSearch = (val: boolean) => {
  showSearch.value = val
}
const handleTheme = (e) => {
  e.preventDefault()
  // 阻止事件

  console.log(e, "2131212")
}
</script>

<style lang="scss" scoped></style>
