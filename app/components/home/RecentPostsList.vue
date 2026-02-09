<template>
  <ul class="space-y-3">
    <li
      v-for="post in blogs"
      :key="post.id"
      class="text-sm"
    >
      <NuxtLink
        :to="`/article/${post.id}`"
        class="block hover:text-primary"
      >
        <div class="flex justify-between items-center">
          <span class="line-clamp-1">{{ post.title }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
            {{ formattedDate(post.publish_time) }}
          </span>
        </div>
      </NuxtLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { IBlog } from "@/types/blog"
import { formatChineseDateTime } from "../../utils/data"

defineProps<{
  blogs: IBlog[]
}>()
const formattedDate = (date: string) => formatChineseDateTime(date)
</script>
