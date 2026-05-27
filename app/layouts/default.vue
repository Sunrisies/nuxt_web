<template>
  <div class="min-h-screen flex flex-col antialiased">
    <ScrollProgressBar />
    <div ref="headerRef"><AppHeader /></div>
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
    <div ref="footerRef" class="hidden md:block"><AppFooter /></div>
    <ScrollToTopButton />
  </div>
</template>

<script setup lang="ts">
const headerRef = useTemplateRef<HTMLDivElement>("headerRef")
const footerRef = useTemplateRef<HTMLDivElement>("footerRef")
const mainMinHeight = ref(
  typeof window !== "undefined" ? window.innerHeight : 800
)

provide("layoutContainerHeight", mainMinHeight)

function calcHeight() {
  const headerH = headerRef.value?.offsetHeight ?? 0
  const footerH = footerRef.value?.offsetHeight ?? 0
  console.log(headerH, footerH, headerRef.value, footerRef.value)
  mainMinHeight.value = window.innerHeight - headerH - footerH
  console.log(mainMinHeight.value)
}

onMounted(() => {
  calcHeight()
  window.addEventListener("resize", calcHeight)
  const ro = new ResizeObserver(calcHeight)
  if (headerRef.value) ro.observe(headerRef.value)
  if (footerRef.value) ro.observe(footerRef.value)
  onUnmounted(() => {
    window.removeEventListener("resize", calcHeight)
    ro.disconnect()
  })
})
</script>
