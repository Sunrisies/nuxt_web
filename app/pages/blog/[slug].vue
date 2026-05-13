<template>
  <div>
    <BlogDetail
      :id="Number(id)"
      :blogs="blogs"
      :pagination="pagination"
      :categories="categories"
      :tags="tags"
    />
  </div>
</template>

<script setup lang="ts">
import type { IBlog } from "~/types/blog"

const route = useRoute()
const id = route.params.slug as string
const toast = useToast()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || "https://sunrise1024.top"
const pageUrl = `${siteUrl}/blog/${id}`

// 并行获取分类和文章数据
const [{ data: postRes, error: postError }, { data: categoriesRes }, { data: tagsRes }] = await Promise.all([
  useAsyncData(`post-${id}`, () =>
    http({
      url: `/v1/posts?page=${id}&limit=9`
    })
  ),
  useAsyncData("categories", () =>
    http({
      url: "/v1/categories"
    })
  ),
  useAsyncData("tags", () =>
    http({
      url: "/v1/tags"
    })
  )
])
if (postError.value) {
  console.error("Failed to fetch posts:", postError.value)
  // 使用 NuxtUI 的通知组件显示错误

  // 使用 NuxtUI 的通知组件显示错误
  toast.add({
    title: "数据加载失败",
    description: "无法获取博客文章，请稍后再试。",
    icon: "i-lucide-calendar-days"
  })
  // 抛出错误
  // throw postError.value;
  throw createError({
    status: 500,
    statusText: "服务端响应错误",
    data: {
      myCustomField: true
    }
  })
}
console.log(tagsRes.value, "文章列表数据")
const blogs = postRes.value.data?.map((blog: IBlog) => ({
  path: `/article/${blog.uuid}`, // 生成文章路径
  title: blog.title,
  description: blog.description,
  image: blog.cover, // cover 映射到 image
  date: blog.publish_time, // 使用 publish_time 作为日期
  authors: [blog.author], // 将 author 转换为数组
  badge: blog.is_top ? "置顶" : blog.category.name, // 根据是否置顶显示不同的徽章
  // 可以添加其他需要的字段
  views: blog.views,
  category: blog.category,
  tags: blog.tags
}))
// console.log("打印数据", categoriesRes.value);
const pagination = postRes.value?.pagination ?? { total: 0, limit: 8 }
const categories = categoriesRes.value?.data.map((category: { id: number | string, name: string }) => ({
  value: category.id, // 生成分类路径
  label: category.name
}))
const tags = tagsRes.value?.data.map((tag: { id: number | string, name: string }) => ({
  value: tag.id, // 生成标签路径
  label: tag.name
}))

const seoTitle = `博客列表第 ${id} 页 | 朝阳的码农札记`
const seoDescription = `朝阳的码农札记博客分页列表，第 ${id} 页，包含最新技术文章与分类导航。`
const seoImage = `${siteUrl}/blog.webp`

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: "website",
  ogUrl: pageUrl,
  ogImage: seoImage,
  twitterCard: "summary_large_image",
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
  robots: "index, follow"
})

useHead({
  link: [
    {
      rel: "canonical",
      href: pageUrl
    }
  ]
})
</script>
