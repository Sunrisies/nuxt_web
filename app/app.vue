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
</script>

<style lang="scss" scoped></style>
