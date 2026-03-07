<template>
  <div>2112</div>
</template>

<script setup lang="ts">
const { data } = await useFetch("/api/navigationBar")
console.log(data.value, "请求数据")
</script>

<style lang="scss" scoped></style>
