<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const slug = 1
const { data } = await useAsyncData('posts', () =>
  http({
    url: `/v1/posts?page=${slug}&limit=12`
  })
)
console.log(data.value, '请求数据')
</script>

<style lang="scss" scoped></style>
