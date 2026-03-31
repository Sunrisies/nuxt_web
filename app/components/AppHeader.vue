<template>
  <UHeader>
    <template #title>
      <div class="flex items-center gap-2 mr-4">
        <ClientOnly fallback-tag="span" fallback="Loading comments...">
          <NuxtLink href="/" class="flex items-center gap-2">
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
  { label: "首页", to: "/" },
  { label: "文章", to: "/blog/1" },
  { label: "归档", to: "/archives" },
  { label: "时光轴", to: "/timeline" },
  { label: "导航", to: "/navigationBar" },
  { label: "关于", to: "/about" }
]
</script>

<style lang="scss" scoped></style>
