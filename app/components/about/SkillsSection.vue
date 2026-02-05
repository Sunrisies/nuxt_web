<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">技术技能</h2>
      </template>

      <div class="space-y-4">
        <div v-for="skill in skills" :key="skill.name" class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="font-medium">{{ skill.name }}</span>
            <div class="flex items-center gap-2">
              <UBadge color="gray" variant="outline" class="text-xs">
                {{ skill.category }}
              </UBadge>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ skill.level }}%</span>
            </div>
          </div>
          <UProgress v-model="skill.level" size="xs" />
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">开发工具</h2>
      </template>

      <div class="flex flex-wrap gap-2 mb-6">
        <UBadge 
          v-for="tool in tools" 
          :key="tool" 
          color="gray"
          variant="subtle"
        >
          {{ tool }}
        </UBadge>
      </div>

      <div class="space-y-4">
        <h3 class="font-medium">工作流程</h3>
        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div v-for="workflow in workflows" :key="workflow" class="flex items-center gap-2">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <span>{{ workflow }}</span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup>
const skills = [
  { name: "JavaScript/TypeScript", level: 95, category: "前端" },
  { name: "React/Next.js", level: 90, category: "前端" },
  { name: "Vue.js", level: 85, category: "前端" },
  { name: "Node.js", level: 88, category: "后端" },
  { name: "Python", level: 80, category: "后端" },
  { name: "PostgreSQL/MongoDB", level: 85, category: "数据库" },
  { name: "Docker/Kubernetes", level: 75, category: "DevOps" },
  { name: "AWS/云服务", level: 82, category: "云计算" },
]

const workflows = [
  "敏捷开发 & Scrum",
  "测试驱动开发 (TDD)",
  "持续集成/持续部署 (CI/CD)",
  "代码审查 & 结对编程"
]

const tools = ["VS Code", "Git", "Docker", "JavaScript", "ApiFox", "Vue 全家桶", "Webpack", "Vite", "React", "Next.js", "Node.js", "Nestjs", "PostgreSQL", "MongoDB", "Redis", "Nginx"]
</script>