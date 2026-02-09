<template>
  <UButton
    v-if="isVisible"
    icon="i-heroicons-arrow-up"
    size="lg"
    color="primary"
    class="fixed bottom-4 right-4 z-50"
    :ui="{ rounded: 'rounded-full' }"
    @click="scrollToTop"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"

const isVisible = ref(false)

const handleScroll = () => {
  isVisible.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  })
}

onMounted(() => {
  window.addEventListener("scroll", handleScroll)
})

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll)
})
</script>
