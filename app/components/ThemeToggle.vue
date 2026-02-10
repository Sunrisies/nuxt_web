<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next"

const theme = ref<"light" | "dark">("light")
const mounted = ref(false)

// 只在客户端初始化主题
onMounted(() => {
  mounted.value = true

  const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
  if (savedTheme) {
    theme.value = savedTheme
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    theme.value = "dark"
  }
})

// 应用主题到DOM
watch([theme, mounted], () => {
  if (!mounted.value) return

  document.documentElement.classList.toggle("dark", theme.value === "dark")
  localStorage.setItem("theme", theme.value)
})

// 切换主题处理函数
const handleThemeChange = async (event: MouseEvent) => {
  // 获取点击位置
  const x = event.clientX
  const y = event.clientY

  // 计算过渡半径（从点击位置到最远角落的距离）
  const transitionRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  // 判断主题切换方向
  const isDarkToLight = theme.value === "dark"

  // 检查是否支持 View Transition API
  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      theme.value = isDarkToLight ? "light" : "dark"
    })

    // 等待过渡准备就绪
    await transition.ready

    // 从亮到暗：使用裁切半径从小到大实现扩散效果
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
    // 降级方案：直接切换主题
    theme.value = isDarkToLight ? "light" : "dark"
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
        theme === 'dark' ? 'translate-x-7' : 'translate-x-0',
        'hover:shadow-lg'
      ]"
    >
      <Moon v-if="theme === 'dark'" class="h-4 w-4 text-slate-700" />
      <Sun v-else class="h-4 w-4 text-amber-400" />
    </div>
  </button>
</template>
