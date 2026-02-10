<template>
  <NuxtLayout>
    <div class="flex justify-center items-center px-3" :style="{ height: containerHeight }">
      <!-- 404 页面 -->
      <div v-if="error.statusCode === 404">
        <h1>404</h1>
        <h2>页面不存在</h2>
        <p>您访问的页面可能已经被移除、重命名或暂时不可用。</p>
        <div class="actions">
          <button @click="handleGoHome">返回首页</button>
          <button @click="handleGoBack">返回上一页</button>
        </div>
      </div>

      <!-- 其他错误页面 -->
      <div v-else>
        <h1>{{ error.statusCode || "错误" }}</h1>
        <h2>{{ error.message || "发生了一些错误" }}</h2>
        <p>抱歉，我们正在努力修复这个问题。</p>
        <button @click="handleClearError">重试</button>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({
  layout: "default"
})
// 错误对象会自动注入
const props = defineProps({
  error: Object
})

// 清除错误并返回首页
const handleClearError = () => clearError({ redirect: "/" })

// 返回首页
const handleGoHome = () => {
  clearError()
  navigateTo("/")
}
const containerHeight = ref("65vh")
const updateHeight = () => {
  const footer = document.querySelector("footer")
  const header = document.querySelector("header")
  if (footer && header) {
    const footerHeight = footer.offsetHeight
    const headerHeight = header.offsetHeight
    const calculatedHeight = `calc(100vh - ${footerHeight}px - ${headerHeight}px)`
    containerHeight.value = calculatedHeight
  }
}
onMounted(() => {
  updateHeight()
})
window.addEventListener("resize", updateHeight)

onUnmounted(() => {
  window.removeEventListener("resize", updateHeight)
})
// 返回上一页
const handleGoBack = () => {
  clearError()
  navigateTo(-1)
}
</script>

<style scoped lang="scss">
.error-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.error-content {
  height: 100vh;
}

h1 {
  font-size: 8rem;
  margin: 0;
  color: var(--primary-color);
  line-height: 1;
}

h2 {
  font-size: 2rem;
  margin: 20px 0;
  color: var(--text-color);
}

p {
  font-size: 1.1rem;
  margin-bottom: 30px;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

button {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

button:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}
</style>
