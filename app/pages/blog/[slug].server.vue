<!-- <script setup lang="ts">
import type { IBlog } from "~/types/blog"

console.log("打印数据")
const posts = ref<IBlog[]>([])
// API 函数
const getPostApi = async () => {
  const { data } = await useAsyncData("blogs", () =>
    http({
      url: `/v1/posts?page=1&limit=12`
    })
  )
  return data.value || []
}
const page = {
  title: "Blog",
  description: "Latest news and updates from our team"
}
try {
  const response = await getPostApi()
  // 转换数据格式
  posts.value = response.data.map((post) => ({
    path: `/posts/${post.uuid}`, // 生成文章路径
    title: post.title,
    description: post.description,
    image: post.cover, // cover 映射到 image
    date: post.publish_time, // 使用 publish_time 作为日期
    authors: [post.author], // 将 author 转换为数组
    badge: post.is_top ? "置顶" : post.category.name, // 根据是否置顶显示不同的徽章
    // 可以添加其他需要的字段
    views: post.views,
    category: post.category,
    tags: post.tags
  }))

  console.log(posts.value.length, "转换后的博客数据")
} catch (error) {
  console.error("获取文章失败:", error)
}
</script>

<template>
  <UContainer>
    <UPageHeader v-bind="page" class="py-[50px]" />

    <UPageBody>
      <UBlogPosts>
        <UBlogPost
          v-for="(post, index) in posts"
          :key="post.uuid"
          :to="post.path"
          :title="post.title"
          :description="post.description"
          :image="post.image"
          :date="
            new Date(post.date).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          "
          :authors="post.authors"
          :badge="post.badge"
          :orientation="index === 0 ? 'horizontal' : 'vertical'"
          :class="[index === 0 && 'col-span-full']"
          variant="naked"
          :ui="{
            description: 'line-clamp-2'
          }"
        />
      </UBlogPosts>
    </UPageBody>
  </UContainer>
</template> -->

<template>
  <div>
    <BlogDetail
      :blog="blog"
      :pagination="pagination"
      :categories="categories"
      :id="Number(id)"
    />
    <ScrollToTopButton />
  </div>
</template>

<script setup lang="ts">
import type { CategoriesType, IBlog } from "~/types/blog";

const route = useRoute();
const id = route.params.id as string;

// 获取客户端 headers（服务端渲染时转发必要的头信息）
// const headers = process.server
//   ? useRequestHeaders(["cookie", "user-agent"])
//   : {};

// 并行获取分类和文章数据
const [{ data: postRes }, { data: categoriesRes }] = await Promise.all([
  useAsyncData(`post-${id}`, () =>
    // $fetch<{ data: IBlog[]; pagination: { total: number; limit: number } }>(
    //   `/api/article?page=${id}&limit=8`,
    //   { headers }
    // )
    http({
      url: `/v1/posts?page=1&limit=8`,
    }),
  ),
  useAsyncData(
    "categories",
    () =>
      http({
        url: "/api/categories",
      }),
    // $fetch<{ data: CategoriesType[] }>("/api/categories", { headers }),
  ),
]);
// const blog = postRes.value.data.map((post) => ({
//   path: `/posts/${post.uuid}`, // 生成文章路径
//   title: post.title,
//   description: post.description,
//   image: post.cover, // cover 映射到 image
//   date: post.publish_time, // 使用 publish_time 作为日期
//   authors: [post.author], // 将 author 转换为数组
//   badge: post.is_top ? "置顶" : post.category.name, // 根据是否置顶显示不同的徽章
//   // 可以添加其他需要的字段
//   views: post.views,
//   category: post.category,
//   tags: post.tags,
// }));
// 提取数据
const blog = postRes.value?.data ?? [];
const pagination = postRes.value?.pagination ?? { total: 0, limit: 8 };
const categories = categoriesRes.value?.data ?? [];
</script>
