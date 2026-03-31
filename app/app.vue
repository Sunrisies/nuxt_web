<template>
  <Html lang="zh-CN" />
  <UApp :locale="zh_cn">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { zh_cn } from "@nuxt/ui/locale"

defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  console.log("Runtime Config:", config)
  console.log("API Base:", config.public.apiBase)
})
console.log(process.env, "环境变量")
</script>

<style lang="scss" scoped></style>
