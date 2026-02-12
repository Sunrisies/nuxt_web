<template>
  <div>
    <!-- <BlogDetail
      :blogs="blogs"
      :pagination="pagination"
      :categories="categories"
      :id="Number(id)"
    /> -->
    
      
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

// 仅在服务端获取 headers
console.log(useDevice(),'=========')
// 并行获取分类和文章数据
const [{ data: postRes }, { data: categoriesRes }] = await Promise.all([
  useAsyncData(`post-${id}`, () =>
    http({
      url: `/v1/posts?page=1&limit=9`,
    }),
  ),
  useAsyncData(
    "categories",
    () =>
      http({
        url: "/v1/categories",
      }),
  ),
]);

const blogs = postRes.value.data?.map((blog: IBlog) => ({
  path: `/posts/${blog.uuid}`, // 生成文章路径
  title: blog.title,
  description: blog.description,
  image: blog.cover, // cover 映射到 image
  date: blog.publish_time, // 使用 publish_time 作为日期
  authors: [blog.author], // 将 author 转换为数组
  badge: blog.is_top ? "置顶" : blog.category.name, // 根据是否置顶显示不同的徽章
  // 可以添加其他需要的字段
  views: blog.views,
  category: blog.category,
  tags: blog.tags,
}));
console.log("打印数据", blogs);
const pagination = postRes.value?.pagination ?? { total: 0, limit: 8 };
const categories = categoriesRes.value?.data ?? [];
</script>
