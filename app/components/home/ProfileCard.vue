<template>
  <div class="rounded-lg border bg-card p-4 shadow-sm">
    <div class="flex flex-col items-center">
      <Avatar />
      <h2 class="mt-4 text-lg font-medium">朝阳</h2>
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">朝阳的码农札记</p>

      <div class="mt-4 flex gap-2">
        <UButton variant="ghost" size="icon" :to="'https://github.com/Sunrisies'" target="_blank">
          <UIcon name="i-heroicons-github" class="h-4 w-4" />
        </UButton>

        <UButton variant="ghost" size="icon" :to="'mailto:3266420686@qq.com'">
          <UIcon name="i-heroicons-envelope" class="h-4 w-4" />
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/Avatar.vue'
</script>
