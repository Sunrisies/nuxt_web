<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">文章管理</h1>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="showCreateModal = true"
      >
        新建文章
      </UButton>
    </div>

    <UCard>
      <UTable
        :rows="posts"
        :columns="columns"
        :loading="loading"
        :empty-state="{ icon: 'i-heroicons-document-text', label: '暂无文章' }"
      >
        <template #status="{ row }">
          <div class="flex gap-1">
            <UBadge v-if="row.is_top" label="置顶" color="warning" variant="subtle" size="sm" />
            <UBadge v-if="row.is_hide" label="隐藏" color="neutral" variant="subtle" size="sm" />
          </div>
        </template>
        <template #publish_time="{ row }">
          <span class="text-sm text-gray-500">{{ formatDate(row.publish_time) }}</span>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-1">
            <UButton
              :to="`/article/${row.uuid}`"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-eye"
              target="_blank"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-pencil-square"
              @click="editPost(row)"
            />
            <UButton
              color="red"
              variant="ghost"
              size="sm"
              icon="i-heroicons-trash"
              @click="confirmDelete(row)"
            />
          </div>
        </template>
      </UTable>

      <div v-if="pagination.total > 0" class="mt-4 flex justify-center">
        <UPagination
          v-model:page="page"
          :items-per-page="pagination.limit"
          :total="pagination.total"
          @update:page="fetchPosts"
        />
      </div>
    </UCard>

    <!-- 新建/编辑弹窗 -->
    <UModal v-model:open="showCreateModal">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">{{ editingPost ? '编辑文章' : '新建文章' }}</h2>
        </template>

        <UForm :state="postForm" class="space-y-4">
          <UFormField label="标题" required>
            <UInput v-model="postForm.title" class="w-full" />
          </UFormField>

          <UFormField label="描述">
            <UTextarea v-model="postForm.description" class="w-full" />
          </UFormField>

          <UFormField label="内容" required>
            <UTextarea v-model="postForm.content" class="w-full" :rows="10" />
          </UFormField>

          <div class="flex items-center gap-4">
            <UFormField label="置顶">
              <UToggle v-model="postForm.is_top" />
            </UFormField>
            <UFormField label="隐藏">
              <UToggle v-model="postForm.is_hide" />
            </UFormField>
          </div>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showCreateModal = false">取消</UButton>
            <UButton color="primary" :loading="saving" @click="savePost">保存</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 删除确认 -->
    <UModal v-model:open="showDeleteModal">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">确认删除</h2>
        </template>
        <p>确定要删除「{{ deletingPost?.title }}」吗？此操作不可撤销。</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showDeleteModal = false">取消</UButton>
            <UButton color="red" :loading="deleting" @click="handleDelete">删除</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "admin-auth"
})

import { http } from "~/composables/http"
import { formatChineseDateTime } from "~/utils/data"

const posts = ref<any[]>([])
const page = ref(1)
const pagination = ref({ total: 0, limit: 10 })
const loading = ref(true)

const columns = [
  { key: "title", label: "标题" },
  { key: "status", label: "状态" },
  { key: "views", label: "浏览" },
  { key: "publish_time", label: "发布时间" },
  { key: "actions", label: "操作" },
]

const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const editingPost = ref<any>(null)
const deletingPost = ref<any>(null)
const saving = ref(false)
const deleting = ref(false)

const postForm = reactive({
  title: "",
  description: "",
  content: "",
  is_top: false,
  is_hide: false,
})

async function fetchPosts() {
  loading.value = true
  try {
    const res = await http<{ data: any[], pagination: { total: number, limit: number } }>({
      url: `/v1/posts?page=${page.value}&limit=10`
    })
    posts.value = res.data || []
    pagination.value = res.pagination
  } catch (e) {
    console.error("获取文章列表失败", e)
  } finally {
    loading.value = false
  }
}

function editPost(post: any) {
  editingPost.value = post
  postForm.title = post.title
  postForm.description = post.description
  postForm.content = post.content
  postForm.is_top = post.is_top
  postForm.is_hide = post.is_hide
  showCreateModal.value = true
}

async function savePost() {
  saving.value = true
  try {
    const url = editingPost.value ? `/v1/posts/${editingPost.value.id}` : "/v1/posts"
    const method = editingPost.value ? "PUT" as const : "POST" as const
    await http({ url, method, body: postForm })
    showCreateModal.value = false
    resetForm()
    await fetchPosts()
  } catch (e) {
    console.error("保存文章失败", e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(post: any) {
  deletingPost.value = post
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingPost.value) return
  deleting.value = true
  try {
    await http({ url: `/v1/posts/${deletingPost.value.id}`, method: "DELETE" })
    showDeleteModal.value = false
    deletingPost.value = null
    await fetchPosts()
  } catch (e) {
    console.error("删除文章失败", e)
  } finally {
    deleting.value = false
  }
}

function resetForm() {
  editingPost.value = null
  postForm.title = ""
  postForm.description = ""
  postForm.content = ""
  postForm.is_top = false
  postForm.is_hide = false
}

function formatDate(date: string) {
  return formatChineseDateTime(date)
}

onMounted(fetchPosts)
</script>
