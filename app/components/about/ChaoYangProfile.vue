<template>
  <div class="relative">
    <!-- Hero Section -->
    <div class="text-center mb-12">
      <div class="relative inline-block mb-6">
        <!-- <UAvatar 
          size="md"
          src="/blog.png" 
          alt="朝阳" 
          class="border-4 border-white dark:border-gray-900"
        /> -->

        <Avatar :size="48" src="/blog.png" alt="自定义头像" />
        <div
          class="absolute -bottom-2 -right-1 bg-primary text-primary-foreground rounded-full p-2"
        >
          <Icon name="lucide:code" class="h-4 w-4" />
        </div>
      </div>
      <h1 class="text-4xl font-bold mb-2">朝阳</h1>
      <p class="text-xl text-muted-foreground mb-4">
        全栈开发工程师 & 代码农夫
      </p>

      <div
        class="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground"
      >
        <div class="flex items-center gap-1">
          <Icon name="lucide:map-pin" class="h-4 w-4" />
          <span>北京, 中国</span>
        </div>
        <div class="flex items-center gap-1">
          <Icon name="lucide:calendar" class="h-4 w-4" />
          <span>5年+ 开发经验</span>
        </div>
        <div class="flex items-center gap-1">
          <Icon name="lucide:coffee" class="h-4 w-4" />
          <span>咖啡爱好者</span>
        </div>
      </div>
    </div>

    <!-- Biography Section -->
    <UCard class="mb-8">
      <template #header>
        <h2 class="text-2xl font-semibold">关于我</h2>
      </template>

      <div class="prose prose-gray max-w-none">
        <p class="text-muted-foreground leading-relaxed mb-4">
          你好！我是朝阳，一名热爱技术的全栈开发工程师。我在软件开发领域已经耕耘了5年多，
          专注于现代Web技术栈，包括React、Node.js、TypeScript等。我喜欢将自己称为"代码农夫"，
          因为我相信编程就像种田一样，需要耐心、细心和持续的努力才能收获丰硕的成果。
        </p>

        <p class="text-muted-foreground leading-relaxed mb-4">
          我的技术之路始于大学时期对计算机科学的浓厚兴趣。毕业后，我加入了一家初创公司，
          从前端开发做起，逐渐扩展到后端和全栈开发。在这个过程中，我不仅积累了丰富的技术经验，
          也培养了解决复杂问题的能力和团队协作精神。
        </p>

        <p class="text-muted-foreground leading-relaxed">
          除了编程，我还热爱阅读技术书籍、参与开源项目，以及在技术社区分享我的经验和见解。
          我相信知识的分享能够推动整个技术社区的进步，这也是我创建这个博客的初衷。
          在这里，我会分享我的"代码农夫笔记"，记录我在开发过程中的思考、学习和成长。
        </p>
      </div>
    </UCard>

    <!-- Interests & Values -->
    <UCard>
      <template #header>
        <h2 class="text-2xl font-semibold">兴趣与价值观</h2>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 class="text-lg font-medium mb-3">技术兴趣</h3>
          <div class="flex flex-wrap gap-2">
            <UBadge color="primary">前端开发</UBadge>
            <UBadge color="primary">后端架构</UBadge>
            <UBadge color="primary">云计算</UBadge>
            <UBadge color="primary">DevOps</UBadge>
            <UBadge color="primary">开源项目</UBadge>
            <UBadge color="primary">技术写作</UBadge>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-medium mb-3">个人爱好</h3>
          <div class="flex flex-wrap gap-2">
            <UBadge variant="outline">摄影</UBadge>
            <UBadge variant="outline">阅读</UBadge>
            <UBadge variant="outline">旅行</UBadge>
            <UBadge variant="outline">咖啡</UBadge>
            <UBadge variant="outline">音乐</UBadge>
            <UBadge variant="outline">健身</UBadge>
          </div>
        </div>
      </div>

      <div class="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 class="text-lg font-medium mb-2">我的座右铭</h3>
        <blockquote class="text-muted-foreground italic">
          代码如诗，架构如画。用心编写每一行代码，用爱构建每一个系统。
        </blockquote>
      </div>
    </UCard>
  </div>
</template>

<script setup>
const avatarUrl = "/avatar.png"; // 替换为实际的头像URL
</script>
