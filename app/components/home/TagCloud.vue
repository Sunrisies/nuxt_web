<template>
  <div class="flex flex-wrap gap-2">
    <NuxtLink
      v-for="tag in tags"
      :key="tag.name"
      :to="`/tag/${tag.name.toLowerCase()}`"
    >
      <UBadge
        variant="outline"
        class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {{ tag.name }}
        <span class="ml-1 text-xs text-gray-500 dark:text-gray-400"> ({{ tag.count }}) </span>
      </UBadge>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from "@/types/blog"

defineProps<{
  tags: Tag[]
}>()
</script>
