<template>
  <UCard
    class="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 p-0"
    :ui="{ body: { padding: 'p-5' } }"
  >
    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <UIcon
        name="i-heroicons-calendar"
        class="h-3 w-3"
      />
      <time :datetime="formattedDate">{{ formattedDate }}</time>
    </div>

    <h3 class="mt-2 text-xl font-semibold">
      <NuxtLink
        :to="`/article/${blog.uuid}`"
        class="relative hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform group-hover:after:scale-x-100"
      >
        {{ blog.title }}
      </NuxtLink>
    </h3>

    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
      {{ blog.description }}
    </p>

    <div class="mt-4 flex flex-wrap gap-2">
      <UBadge
        v-for="tag in blog.tags"
        :key="tag.id"
        variant="subtle"
        color="primary"
        class="font-normal"
      >
        {{ tag.name }}
      </UBadge>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { IBlog } from "@/types/blog"
import { formatChineseDateTime } from "../../utils/data"

const props = defineProps<{
  blog: IBlog
}>()

const formattedDate = computed(() => formatChineseDateTime(props.blog.publish_time))
</script>
