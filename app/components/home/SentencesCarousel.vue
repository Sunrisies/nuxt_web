<template>
  <div class="mb-6 text-lg text-muted-foreground cursor-pointer relative h-20" @click="handleClick">
    <p
      v-for="(text, index) in sentences"
      :key="index"
      class="absolute w-full transition-all duration-500 ease-in-out"
      :class="[index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-90']"
    >
      {{ text }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const sentences = ['代码如诗,', '架构如画,', '用心编写每一行代码,', '用爱构建每一个系统']

const currentIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const handleClick = () => {
  currentIndex.value = (currentIndex.value + 1) % sentences.length
}

onMounted(() => {
  timer = setInterval(() => {
    handleClick()
  }, 3000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>
