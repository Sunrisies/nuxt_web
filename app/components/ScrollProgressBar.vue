<template>
  <div 
    class="scroll-progress-bar"
    :class="[
      'fixed left-0 w-full h-1.5 bg-gray-200 dark:bg-gray-700 z-[60] shadow-lg transition-opacity duration-300',
      isVisible ? 'opacity-100' : 'opacity-0'
    ]"
  >
    <div
      class="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-md"
      :style="{ width: `${scrollProgress}%` }"
    >
      <div class="h-full w-full bg-white opacity-30 animate-pulse"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const scrollProgress = ref(0)
const isVisible = ref(false)

let ticking = false

const handleScroll = () => {
  // 如果不在顶部，则显示进度条
  if (window.scrollY > 0) {
    isVisible.value = true
  } else {
    // 如果在顶部，则隐藏进度条
    isVisible.value = false
  }

  if (!ticking) {
    window.requestAnimationFrame(() => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPosition = window.scrollY
      const progress = (scrollPosition / totalHeight) * 100
      scrollProgress.value = progress
      ticking = false
    })
    ticking = true
  }
}

// 初始化滚动进度
const initScrollProgress = () => {
  handleScroll()
}

onMounted(() => {
  // 初始化
  initScrollProgress()
  
  // 添加滚动事件监听
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  // 移除滚动事件监听
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.scroll-progress-bar {
  top: 0;
}
</style>