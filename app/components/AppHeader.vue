<template>
  <!-- <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
    <div class="container flex h-14 items-center">
      <div class="flex items-center gap-2 mr-4">
        <Link href="/" class="flex items-center gap-2">
          <span class="text-lg font-bold">中文博客</span>
        </Link>
      </div>
      <div>
        <div class="relative flex items-center w-full" v-if="showSearch">
          <Input type="search" placeholder="Search..." autoFocus />
          <Button variant="ghost" size="icon" class="absolute right-0" @click="setShowSearch(false)">
            <X class="h-4 w-4" />
            <span class="sr-only">Close search</span>
          </Button>
        </div>
        <template v-else>
          <Button variant="ghost" size="icon" @click="setShowSearch(true)">
            <Search class="h-5 w-5" />
            <span class="sr-only">Search</span>
          </Button>
        </template>
      </div>

      <nav class="hidden md:flex md:gap-6 flex-1 justify-center">
        <div v-for="item in navItems">
          <NuxtLink :to="item.href" class="flex items-center gap-2">
            <span>{{ item.name }}</span>
          </NuxtLink>
        </div>
      </nav>

      <ThemeToggle></ThemeToggle>
    </div>
  </header>
   -->
  <UHeader>
    <template #title>
      <Logo class="h-6 w-auto" />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton @click="handleTheme" />

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
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Docs',
    to: '/docs/getting-started',
    active: route.path.startsWith('/docs/getting-started')
  },
  {
    label: 'Components',
    to: '/docs/components',
    active: route.path.startsWith('/docs/components')
  },
  {
    label: 'Figma',
    to: 'https://go.nuxt.com/figma-ui',
    target: '_blank'
  },
  {
    label: 'Releases',
    to: 'https://github.com/nuxt/ui/releases',
    target: '_blank'
  }
])
const navItems = [
  { name: 'Home', href: '/' },
  { name: '文章', href: '/blog/1' },
  { name: '时光轴', href: '/timeline' },
  {
    name: '影像长廊',
    href: '/album'
  },
  { name: '音乐库', href: '/music-player' },
  { name: '第三方库', href: '/libraries' },
  { name: '资源库', href: '/chat' },
  { name: '关于', href: '/about' }
]

const showSearch = ref(false)
const setShowSearch = (val: boolean) => {
  showSearch.value = val
}
const handleTheme = (e) => {
  e.preventDefault()
  // 阻止事件

  console.log(e, '2131212')
}
</script>

<style lang="scss" scoped></style>
