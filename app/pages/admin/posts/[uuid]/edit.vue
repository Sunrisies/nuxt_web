<template><AdminArticleEditor :key="uuid" :uuid="uuid" /></template>
<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" })
const route = useRoute()
const uuid = computed(() => String(route.params.uuid))
</script>
