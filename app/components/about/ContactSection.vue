<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <Icon name="lucide:message-circle" class="h-5 w-5" />
        <h2 class="text-xl font-semibold">联系我</h2>
      </div>
    </template>

    <p class="text-gray-600 dark:text-gray-400 mb-6">
      欢迎与我交流技术话题、工作机会或任何有趣的想法。我很乐意与同行开发者分享经验，也期待学习新的知识和观点。
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="method in contactMethods"
        :key="method.label"
        class="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
        @click="handleContactClick(method)"
      >
        <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
          <Icon :name="method.icon" class="h-4 w-4 text-primary" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ method.label }}</span>
            <UButton 
              variant="ghost" 
              size="xs"
              :to="method.href"
              target="_blank"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop
            >
              {{ method.value }}
            </UButton>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ method.description }}</p>
        </div>
      </div>
    </div>

    <div class="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 class="font-medium mb-2">合作意向</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        我对以下类型的合作特别感兴趣：技术咨询、开源项目贡献、技术写作、演讲分享以及有挑战性的全栈开发项目。
      </p>
    </div>
  </UCard>
</template>

<script setup>
const toast = useToast()

const contactMethods = [
  {
    icon: 'lucide:mail',
    label: "邮箱",
    value: "3266420686@qq.com",
    href: "mailto:3266420686@qq.com",
    description: "工作合作或技术交流",
  },
  {
    icon: 'lucide:github',
    label: "GitHub",
    value: "Sunrisies",
    href: "https://github.com/Sunrisies",
    description: "查看我的开源项目",
  },
]

const handleContactClick = (method) => {
  if (method.label === '邮箱') {
    // 复制邮箱到剪贴板
    navigator.clipboard.writeText(method.value)
    toast.add({
      title: '邮箱已复制',
      description: `${method.value} 已复制到剪贴板`,
      color: 'green'
    })
  }
}
</script>