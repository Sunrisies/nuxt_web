<template>
  <div class="space-y-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold mb-4">代码农夫笔记</h2>
      <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        记录我在软件开发路上的思考、学习和成长。这里有技术教程、开发心得、学习笔记，以及我对技术趋势的观察和思考。
      </p>
    </div>

    <!-- Categories -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard
        v-for="category in noteCategories"
        :key="category.title"
        class="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        @click="navigateToCategory(category.title)"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="p-2 bg-primary/10 rounded-lg">
            <Icon :name="category.icon" class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold text-lg">
              {{ category.title }}
            </h3>
            <p class="text-sm text-gray-500">{{ category.count }} 篇文章</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ category.description }}
        </p>
      </UCard>
    </div>

    <!-- Recent Notes -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">最新笔记</h2>
      </template>

      <div class="space-y-6">
        <div
          v-for="note in blogs"
          :key="note.id"
          class="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-6 last:pb-0 group"
        >
          <div
            class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2"
          >
            <div class="flex items-center gap-2">
              <UBadge color="blue" variant="outline">
                {{ note.category?.name }}
              </UBadge>
              <span class="text-sm text-gray-500">{{
                note?.readTime || "未知"
              }}</span>
            </div>
            <div class="flex items-center gap-1 text-sm text-gray-500">
              <Icon name="lucide:calendar" class="h-3 w-3" />
              <span>{{ formatDateForDisplay(note.publish_time) }}</span>
            </div>
          </div>

          <h3
            class="text-lg font-semibold mb-2 group-hover:text-primary cursor-pointer transition-colors"
            @click="navigateToPost(note.id)"
          >
            {{ note.title }}
          </h3>

          <p class="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {{ note.description }}
          </p>

          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in note.tags"
              :key="tag.id"
              color="gray"
              variant="subtle"
              class="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              @click="navigateToTag(tag.name)"
            >
              {{ tag.name }}
            </UBadge>
          </div>
        </div>

        <div class="text-center pt-4">
          <UButton to="/blog/1" variant="solid" color="primary" class="group">
            查看所有笔记
            <Icon
              name="lucide:arrow-right"
              class="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1"
            />
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const blogs = ref([]);
const loading = ref(false);

const noteCategories = [
  {
    icon: "lucide:code-2",
    title: "技术教程",
    description: "详细的技术教程和实践指南",
    count: 24,
  },
  {
    icon: "lucide:lightbulb",
    title: "开发心得",
    description: "开发过程中的思考和总结",
    count: 18,
  },
  {
    icon: "lucide:book-open",
    title: "学习笔记",
    description: "技术书籍和课程的学习记录",
    count: 12,
  },
];

const navigateToCategory = (category) => {
  navigateTo(`/blog?category=${encodeURIComponent(category)}`);
};

const navigateToPost = (postId) => {
  navigateTo(`/blog/${postId}`);
};

const navigateToTag = (tagName) => {
  navigateTo(`/blog?tag=${encodeURIComponent(tagName)}`);
};

const fetchPosts = async () => {
  try {
    loading.value = true;
    const { data } = await useAsyncData("blogs", () =>
      http({
        url: `/v1/posts?page=1&limit=5`,
      }),
    );

    blogs.value = data.value.data || [];
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    // 使用 NuxtUI 的通知
    useToast().add({
      title: "加载失败",
      description: "无法加载博客文章，请稍后重试",
      color: "red",
    });
  } finally {
    loading.value = false;
  }
};
console.log("请求数据111222");

// onMounted(() => {
  fetchPosts()
// })
</script>
