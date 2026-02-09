<template>
  <div class="container">
    <h1>Article</h1>
    <p>Slug: {{ $route.params.slug }}</p>

    <ContentRenderer v-if="ast" :value="ast" />
    <!-- <MDCRenderer :body="ast.body" :data="ast.data" /> -->
  </div>
</template>

<script setup lang="ts">
// import { parseMarkdown } from '@nuxtjs/mdc/runtime'
const route = useRoute()
const article = ref(null)
// const getArticle = async () => {
const { data } = await useAsyncData(`article-${route.params.slug}`, () =>
  http({
    url: `/v1/posts/${route.params.slug}`
  })
)
// console.log(data.value, 'data')
article.value = data.value || {}
const ast = await parseMarkdown(data.value?.content || '')
// console.log(ast, 'ast-------')
// }

// getArticle()
</script>

<style lang="scss" scoped></style>
