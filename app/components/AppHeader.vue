<template>
  <UHeader>
    <template #title>
      <div class="flex items-center gap-2 mr-4">
        <ClientOnly fallback-tag="span" fallback="Loading comments...">
          <NuxtLink href="/" class="flex items-center gap-2" external>
            <span class="text-lg font-bold">中文博客</span>
          </NuxtLink>
        </ClientOnly>
      </div>
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <ThemeToggle />
      <UTooltip text="Open on GitHub" :kbds="['meta', 'G']">
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
const items = [
  {
    label: "Home",
    to: "/",
    onSelect: () => {
      console.log("点击日期")
    }
  },
  { label: "文章", to: "/blog/1" },
  { label: "时光轴", to: "/timeline" },
  // {
  //   label: '影像长廊',
  //   to: '/album'
  // },
  // { label: '音乐库', to: '/music-player' },
  // { label: '第三方库', to: '/libraries' },
  // { label: '资源库', to: '/chat' },
  { label: "关于", to: "/about" }
]
</script>

<style lang="scss" scoped></style>
