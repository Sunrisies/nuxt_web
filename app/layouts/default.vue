<template>
  <div :class="isClipboard ? 'h-screen flex flex-col overflow-hidden antialiased' : 'min-h-screen flex flex-col antialiased'">
    <ScrollProgressBar />
    <div ref="headerRef"><AppHeader /></div>
    <main class="flex-1 flex flex-col" :class="isClipboard ? 'min-h-0' : ''">
      <slot />
    </main>
    <div ref="footerRef" :class="{ 'hidden md:block': isClipboard }"><AppFooter /></div>
    <ScrollToTopButton />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const isClipboard = computed(() => route.path === "/clipboard")
</script>
