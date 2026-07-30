<template>
  <div class="flex min-h-screen items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})
// 重定向逻辑已移至 middleware/admin-auth.ts
</script>
