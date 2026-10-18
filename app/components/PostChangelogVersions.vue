<template>
  <div class="relative" data-slot="root">
    <div
      data-slot="indicator"
      class="absolute hidden lg:block overflow-hidden inset-y-3 h-full w-px bg-border -ms-[8.5px]"
      :class="indicatorClass"
      aria-hidden="true"
    >
      <div
        class="absolute start-0 top-0 w-full bg-primary transition-[height] duration-150 motion-reduce:transition-none"
        :style="{ height: `${progress}%` }"
      />
    </div>
    <div data-slot="container" class="flex flex-col gap-y-8 sm:gap-y-12 lg:gap-y-16">
      <UChangelogVersion
        v-for="(version, index) in versions"
        :key="typeof version.to === 'string' ? version.to : index"
        v-bind="version"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChangelogVersionProps } from "@nuxt/ui"

withDefaults(defineProps<{
  versions: ChangelogVersionProps[]
  indicatorClass?: string
}>(), { indicatorClass: "start-32" })

// Motion's scroll/spring subscriptions retain SSR app instances in the current
// ChangelogVersions implementation. Only install browser-owned listeners here.
const progress = ref(0)
let frame: number | undefined
let observer: ResizeObserver | undefined
function update() {
  if (frame !== undefined) return
  frame = window.requestAnimationFrame(() => {
    frame = undefined
    const height = document.documentElement.scrollHeight - window.innerHeight
    progress.value = height > 0 ? Math.min(100, Math.max(0, window.scrollY / height * 100)) : 0
  })
}

onMounted(() => {
  update()
  window.addEventListener("scroll", update, { passive: true })
  window.addEventListener("resize", update)
  observer = new ResizeObserver(update)
  observer.observe(document.documentElement)
})
onBeforeUnmount(() => {
  window.removeEventListener("scroll", update)
  window.removeEventListener("resize", update)
  observer?.disconnect()
  if (frame !== undefined) window.cancelAnimationFrame(frame)
})
</script>
