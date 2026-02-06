<template>
  <footer class="w-full border-t bg-linear-to-b from-background to-muted/20 mt-auto">
    <div class="container flex flex-col items-center gap-6 py-8 pc:py-6">
      <div class="flex flex-col md:flex-row items-center justify-between w-full gap-6">
        <div class="flex flex-col items-center md:items-start gap-4 max-w-md">
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span class="text-primary-foreground font-bold text-sm">博</span>
            </div>
            <span class="text-lg font-semibold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-black">
              技术博客
            </span>
          </div>

          <p class="text-center md:text-left text-sm text-muted-foreground leading-relaxed">
            分享前沿技术、开发经验与编程心得
            <br />
            探索数字世界的无限可能
          </p>

          <div class="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <div class="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span>已稳定运行 {{ duration }}</span>
          </div>
        </div>

        <div class="flex sm:flex-row gap-6 sm:gap-10">
          <div class="flex flex-col gap-3">
            <h4 class="text-sm font-semibold text-center">探索</h4>
            <div class="flex flex-col gap-2 text-sm text-muted-foreground">
              <NuxtLink href="/blog/1" class="hover:text-foreground transition-colors"> 文章列表 </NuxtLink>
              <NuxtLink href="/tags" class="hover:text-foreground transition-colors"> 标签云 </NuxtLink>
              <NuxtLink href="/archives" class="hover:text-foreground transition-colors"> 文章归档 </NuxtLink>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <h4 class="text-sm font-semibold text-center">支持</h4>
            <div class="flex flex-col gap-2 text-sm text-muted-foreground">
              <NuxtLink href="/about" class="hover:text-foreground transition-colors"> 关于本站 </NuxtLink>
              <NuxtLink href="/api/rss" class="hover:text-foreground transition-colors"> RSS订阅 </NuxtLink>
              <NuxtLink
                href="https://github.com/yourusername/blog"
                target="_blank"
                rel="noreferrer"
                class="hover:text-foreground transition-colors"
              >
                源码仓库
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center md:items-end gap-4">
          <div class="flex items-center gap-4">
            <NuxtLink
              href="https://github.com/yourusername/blog"
              target="_blank"
              rel="noreferrer"
              class="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            >
             <UIcon name="i-custom-github" class="h-4 w-4"/>
              <span class="sr-only">GitHub</span>
            </NuxtLink>
            <NuxtLink
              href="/api/rss"
              class="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all duration-200"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
              <span class="sr-only">RSS</span>
            </NuxtLink>
            <NuxtLink
              href="mailto:3266420686@qq.com"
              class="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all duration-200"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span class="sr-only">Email</span>
            </NuxtLink>
          </div>

          <div class="text-xs text-muted-foreground text-center md:text-right">
            <p>有想法？欢迎交流</p>
            <p>3266420686@qq.com</p>
          </div>
        </div>
      </div>

      <div class="w-full border-t" />

      <div class="flex flex-col md:flex-row items-center justify-between w-full gap-4">
        <div class="flex flex-col sm:flex-row items-center gap-2 text-sm text-muted-foreground">
          <span>© 2024 技术博客</span>
          <span class="hidden sm:inline">•</span>
          <span>用心创作每一篇内容</span>
        </div>

        <div class="flex items-center gap-4 text-sm">
          <NuxtLink
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            class="text-muted-foreground hover:text-foreground transition-colors hover:underline"
          >
            豫ICP备2025154392号-1
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const SITE_START_TIME = new Date('2024-01-01T00:00:00') // 替换为你的网站上线时间

function getDuration() {
  const now = new Date()
  const diff = now.getTime() - SITE_START_TIME.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  return `${days}天${hours}小时${minutes}分${seconds}秒`
}
const duration = ref('')
const timer = ref<ReturnType<typeof setInterval> | null>(null)
onMounted(() => {
  timer.value = setInterval(() => {
    duration.value = getDuration()
  }, 1000)
})
// 卸载
onUnmounted(() => {
  timer.value && clearInterval(timer.value)
})
</script>

<style lang="scss" scoped></style>
