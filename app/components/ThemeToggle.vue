<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next"

const colorMode = useColorMode()
const isInitialized = ref(false)

// 确保在客户端初始化完成后再显示正确状态
onMounted(() => {
  isInitialized.value = true
})

// 切换主题处理函数
const handleThemeChange = async (event: MouseEvent) => {
  const x = event.clientX
  const y = event.clientY
  const transitionRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const isDarkToLight = colorMode.value === "dark"

  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      colorMode.preference = isDarkToLight ? "light" : "dark"
    })

    await transition.ready

    document.documentElement.animate(
      {
        clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${transitionRadius}px at ${x}px ${y}px)`]
      },
      {
        duration: 1000,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)"
      }
    )
  } else {
    colorMode.preference = isDarkToLight ? "light" : "dark"
  }
}
</script>

<template>
  <button
    class="theme-toggle-button relative h-7 w-14 rounded-full bg-slate-200 transition-colors duration-300 ease-in-out dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
    aria-label="切换主题"
    @click="handleThemeChange"
  >
    <div
      :class="[
        'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out flex items-center justify-center',
        isInitialized && colorMode.value === 'dark' ? 'translate-x-7' : 'translate-x-0',
        'hover:shadow-lg'
      ]"
    >
      <Moon v-if="isInitialized && colorMode.value === 'dark'" class="h-4 w-4 text-slate-700" />
      <Sun v-else class="h-4 w-4 text-amber-400" />
    </div>
  </button>
</template>
