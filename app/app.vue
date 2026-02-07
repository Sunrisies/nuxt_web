<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  console.log('Runtime Config:', config)
  console.log('API Base:', config.public.apiBase)
})
</script>

<style lang="scss" scoped></style>
