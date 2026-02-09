<template>
    <div class="container">
        <UContainer v-if="article">
            <UPageHeader :title="article.title" :description="article.description">
                <template #headline>
                    <UBadge :label="article.category.name" variant="subtle" />
                    <span class="text-muted">&middot;</span>
                    <time class="text-muted">{{ new Date(article.publish_time).toLocaleDateString('en', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }) }}</time>
                </template>

                <div class="flex flex-wrap items-center gap-3 mt-4">
                    <UButton color="neutral" variant="subtle" size="sm">
                        <UAvatar :src="article.cover" alt="Author avatar" size="2xs" />
                        {{ article.author }}
                    </UButton>
                </div>

                <div class="flex flex-wrap items-center gap-2 mt-3">
                    <UBadge v-for="tag in article.tags" :key="tag.id" :label="tag.name" variant="soft" />
                </div>
            </UPageHeader>

            <UPage>
                <UPageBody>
                    <ContentRenderer :value="ast" />
                </UPageBody>

                <template v-if="ast?.toc?.links?.length" #right>
                    <div class="hidden lg:block">
                        <ArticleToc :toc="ast.toc" />
                    </div>
                </template>
            </UPage>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
import type { IArticle } from '~/types/article'

const route = useRoute()
const article = ref<IArticle | null>(null)
const { data } = await useAsyncData(`article-${route.params.slug}`, () =>
    http({
        url: `/v1/posts/${route.params.slug}`
    })
)
article.value = data.value || {}
const ast = await parseMarkdown(data.value?.content || '')

</script>

<style lang="scss" scoped></style>
