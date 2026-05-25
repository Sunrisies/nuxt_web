<template>
  <div class="flex min-h-screen items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const router = useRouter()

onMounted(() => {
  const user = localStorage.getItem("admin_user")
  if (user) {
    router.replace("/admin/dashboard")
  } else {
    router.replace("/admin/login")
  }
})
</script>
