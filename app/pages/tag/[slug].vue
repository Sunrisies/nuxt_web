<template>
  <div class="container mx-auto w-full md:w-3/4 px-2 xs:px-4 lg:px-0 py-8">
    <UChangelogVersions :versions="versions" :ui="{ indicator: 'start-56'}" />
  </div>
</template>

<script setup lang="ts">
import type { ChangelogVersionProps } from "@nuxt/ui";

const route = useRoute();
console.log("Tag slug:", route.params.slug);
// 获取所有的标签，并保存下来
const id = route.params.slug;
const { data: tagsRes } = await useAsyncData("tags", () =>
  http({
    url: "/v1/tags/count",
  }),
);
const tagId = tagsRes.value.find((tag) => tag.name === id)?.id;

console.log(tagsRes.value, "-------------", tagId);
const { data: postsRes } = await useAsyncData(`tag-${id}`, () =>
  http({
    url: `/v1/posts?limit=100&tag=${tagId}`,
  }),
);
// 将文章数据转换为 UChangelogVersions 需要的格式
const versions = computed<ChangelogVersionProps[]>(() => {
  return postsRes.value.data.map((post) => ({
    // 组件内置属性
    title: post.title, // 会在 #title 插槽中被覆盖，但保留以供组件内部使用
    description: post.description, // 会在 #description 插槽中被覆盖
    date: formatDateForDisplay(post.publish_time,{showWeekday:false}), // 重要：组件会据此排序
    to: `/article/${post.uuid}`, // 用于生成链接
    // 你需要的自定义数据
    views: post.views || 0,
    tags: post.tags || [],
    // 可以在这里配置组件的一些UI属性
    ui: {
      // 例如自定义容器类
      container: "gap-8!",
      indicator:"w-56" // 你可以根据需要自定义指示器样式
    },
   
  }));
});
console.log(postsRes.value, "-------------");
</script>

<style scoped lang="scss"></style>
