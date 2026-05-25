<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">文章管理</h1>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="openCreate"
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
        <template #title="{ row }">
          <div class="max-w-xs truncate font-medium">{{ row.title }}</div>
        </template>
        <template #status="{ row }">
          <div class="flex gap-1 flex-wrap">
            <UBadge v-if="row.featured" label="推荐" color="warning" variant="subtle" size="sm" />
            <UBadge v-if="row.is_publish" label="已发布" color="green" variant="subtle" size="sm" />
            <UBadge v-if="row.is_top" label="置顶" color="orange" variant="subtle" size="sm" />
            <UBadge v-if="row.is_hide" label="隐藏" color="neutral" variant="subtle" size="sm" />
          </div>
        </template>
        <template #views="{ row }">
          <span class="text-sm">{{ row.views || 0 }}</span>
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
              @click="openEdit(row)"
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
    <UModal v-model:open="showFormModal">
      <UCard class="max-h-[90vh] overflow-y-auto">
        <template #header>
          <h2 class="text-lg font-semibold">{{ editingPost ? '编辑文章' : '新建文章' }}</h2>
        </template>

        <UForm :state="postForm" class="space-y-4">
          <UFormField label="标题" required>
            <UInput v-model="postForm.title" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="分类">
              <USelect
                v-model="postForm.category_id"
                :items="categoryOptions"
                placeholder="选择分类"
                class="w-full"
              />
            </UFormField>

            <UFormField label="标签">
              <USelect
                v-model="postForm.tag_ids"
                :items="tagOptions"
                placeholder="选择标签"
                multiple
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="状态">
              <USelect
                v-model="postForm.status"
                :items="statusOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="封面图">
              <UInput v-model="postForm.cover_image" placeholder="https://..." class="w-full" />
            </UFormField>
          </div>

          <div class="flex items-center gap-6">
            <UFormField label="推荐">
              <UToggle v-model="postForm.featured" />
            </UFormField>
            <UFormField label="置顶">
              <UToggle v-model="postForm.is_top" />
            </UFormField>
            <UFormField label="隐藏">
              <UToggle v-model="postForm.is_hide" />
            </UFormField>
          </div>

          <UFormField label="摘要">
            <UTextarea v-model="postForm.summary" class="w-full" :rows="3" />
          </UFormField>

          <UFormField label="Markdown 内容" required>
            <UTextarea v-model="postForm.markdowncontent" class="w-full font-mono" :rows="16" />
          </UFormField>

          <UFormField label="渲染内容（HTML）">
            <UTextarea v-model="postForm.content" class="w-full font-mono" :rows="10" />
          </UFormField>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="closeForm">取消</UButton>
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

// ─── 数据 ───────────────────────────────────────────────
const posts = ref<any[]>([])
const page = ref(1)
const pagination = ref({ total: 0, limit: 10 })
const loading = ref(true)

const columns = [
  { key: "title",       label: "标题" },
  { key: "status",      label: "状态" },
  { key: "views",       label: "浏览" },
  { key: "publish_time",label: "发布时间" },
  { key: "actions",     label: "操作" },
]

// ─── 分类 / 标签 选项 ────────────────────────────────────
const categories = ref<any[]>([])
const tags = ref<any[]>([])

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: c.name, value: c.id }))
)
const tagOptions = computed(() =>
  tags.value.map(t => ({ label: t.name, value: t.id }))
)

const statusOptions = [
  { label: "草稿",   value: 0 },
  { label: "已发布", value: 1 },
]

// ─── 弹窗状态 ────────────────────────────────────────────
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const editingPost = ref<any>(null)
const deletingPost = ref<any>(null)
const saving = ref(false)
const deleting = ref(false)

const defaultForm = {
  title: "",
  summary: "",
  content: "",
  markdowncontent: "",
  cover_image: "",
  category_id: null as number | null,
  tag_ids: [] as number[],
  status: 0,
  featured: false,
  is_top: false,
  is_hide: false,
}
const postForm = reactive({ ...defaultForm })

// ─── 方法 ────────────────────────────────────────────────
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

async function fetchCategories() {
  try {
    const res = await http<{ data: any[], pagination: any }>({ url: "/v1/categories?page=1&limit=100" })
    categories.value = res.data || []
  } catch { /* ignore */ }
}

async function fetchTags() {
  try {
    const res = await http<{ data: any[], pagination: any }>({ url: "/v1/tags?page=1&limit=100" })
    tags.value = res.data || []
  } catch { /* ignore */ }
}

function openCreate() {
  editingPost.value = null
  Object.assign(postForm, defaultForm)
  showFormModal.value = true
}

function openEdit(post: any) {
  editingPost.value = post
  postForm.title = post.title || ""
  postForm.summary = post.summary || post.description || ""
  postForm.content = post.content || ""
  postForm.markdowncontent = post.markdowncontent || ""
  postForm.cover_image = post.cover || post.cover_image || ""
  postForm.category_id = post.category?.id ?? null
  postForm.tag_ids = post.tags?.map((t: any) => t.id) || []
  postForm.status = post.is_publish ? 1 : 0
  postForm.featured = post.featured ?? post.is_recommend ?? false
  postForm.is_top = post.is_top ?? false
  postForm.is_hide = post.is_hide ?? false
  showFormModal.value = true
}

function closeForm() {
  showFormModal.value = false
  editingPost.value = null
}

async function savePost() {
  if (!postForm.title || !postForm.markdowncontent) return
  saving.value = true
  try {
    const body: Record<string, any> = {
      title: postForm.title,
      summary: postForm.summary,
      content: postForm.content,
      markdowncontent: postForm.markdowncontent,
      cover_image: postForm.cover_image,
      category_id: postForm.category_id,
      tag_ids: postForm.tag_ids,
      status: postForm.status,
      featured: postForm.featured,
    }

    if (editingPost.value) {
      await http({ url: `/v1/posts/${editingPost.value.uuid}`, method: "PUT", body })
    } else {
      await http({ url: "/v1/posts", method: "POST", body })
    }
    closeForm()
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
    await http({ url: `/v1/posts/${deletingPost.value.uuid}`, method: "DELETE" })
    showDeleteModal.value = false
    deletingPost.value = null
    await fetchPosts()
  } catch (e) {
    console.error("删除文章失败", e)
  } finally {
    deleting.value = false
  }
}

function formatDate(date: string) {
  return date ? formatChineseDateTime(date) : "—"
}

onMounted(async () => {
  await Promise.all([fetchPosts(), fetchCategories(), fetchTags()])
})
</script>
