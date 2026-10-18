<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">文章管理</h1>
      <UButton color="primary" icon="i-heroicons-plus" @click="openCreate">
        新建文章
      </UButton>
    </div>

    <form class="mb-4 flex flex-wrap items-end gap-3" @submit.prevent="applyFilters">
      <UFormField label="标题搜索"><UInput v-model="filters.search" aria-label="搜索文章标题" placeholder="输入标题关键词" :maxlength="100" class="w-full sm:w-64" /></UFormField>
      <UFormField label="分类"><USelect v-model="filters.category" aria-label="筛选文章分类" :items="[{ label: '全部分类', value: 0 }, ...categoryOptions]" class="w-40" /></UFormField>
      <UFormField label="标签"><USelect v-model="filters.tag" aria-label="筛选文章标签" :items="[{ label: '全部标签', value: 0 }, ...tagOptions]" class="w-40" /></UFormField>
      <UFormField label="状态"><USelect v-model="filters.status" aria-label="筛选文章状态" :items="[{ label: '全部状态', value: -1 }, ...statusOptions]" class="w-36" /></UFormField>
      <UButton type="submit" :loading="loading">筛选</UButton>
      <UButton variant="outline" @click="resetFilters">重置筛选</UButton>
    </form>
    <UAlert v-if="listError" class="mb-4" color="error" :title="listError">
      <template #actions><UButton variant="outline" @click="fetchPosts">重试</UButton></template>
    </UAlert>
    <UCard>
      <p class="mb-3 text-sm text-gray-500">共 {{ pagination.total }} 篇文章</p>
      <UTable
        :data="posts"
        :columns="columns"
        :loading="loading"
        empty="暂无文章"
      >
        <template #index-cell="{ row }">
          <span class="text-sm text-gray-500">{{ (page - 1) * pagination.limit + row.index + 1 }}</span>
        </template>
        <template #title-cell="{ row }">
          <div class="max-w-xs truncate font-medium">
            {{ row.original.title }}
          </div>
        </template>
        <template #status-cell="{ row }">
          <div class="flex gap-1 flex-wrap">
            <UBadge v-if="!row.original.is_publish && !row.original.is_hide" label="草稿" color="neutral" variant="subtle" size="sm" />
            <UBadge
              v-if="row.original.featured"
              label="推荐"
              color="warning"
              variant="subtle"
              size="sm"
            />
            <UBadge
              v-if="row.original.is_publish"
              label="已发布"
              color="success"
              variant="subtle"
              size="sm"
            />
            <UBadge
              v-if="row.original.is_top"
              label="置顶"
              color="warning"
              variant="subtle"
              size="sm"
            />
            <UBadge
              v-if="row.original.is_hide"
              label="已下线"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>
        </template>
        <template #category-cell="{ row }"><span>{{ row.original.category?.name || '未分类' }}</span></template>
        <template #tags-cell="{ row }"><span>{{ row.original.tags?.map(tag => tag.name).join('、') || '—' }}</span></template>
        <template #views-cell="{ row }">
          <span class="text-sm">{{ row.original.views || 0 }}</span>
        </template>
        <template #publish_time-cell="{ row }">
          <span class="text-sm text-gray-500">{{
            formatDate(row.original.publish_time)
          }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton
              v-if="row.original.is_publish"
              :to="`/article/${row.original.uuid}`"
              aria-label="查看文章"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-eye"
              target="_blank"
            >查看</UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-pencil-square"
              aria-label="编辑文章"
              @click="openEdit(row.original)"
            >编辑</UButton>
            <UButton
              color="error"
              variant="ghost"
              size="sm"
              icon="i-heroicons-trash"
              aria-label="删除文章"
              @click="confirmDelete(row.original)"
            >删除</UButton>
          </div>
        </template>
      </UTable>

      <div v-if="pagination.total > 0" class="mt-4 flex justify-center">
        <UPagination
          :page="page"
          :items-per-page="pagination.limit"
          :total="pagination.total"
          @update:page="onPageChange"
        />
      </div>
    </UCard>

    <!-- 删除确认 -->
    <UModal v-model:open="showDeleteModal" title="确认删除">
      <template #body>
        <p>确定要删除「{{ deletingPost?.title }}」吗？此操作不可撤销。</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="showDeleteModal = false"
            >取消</UButton
          >
          <UButton color="error" :loading="deleting" @click="handleDelete"
            >删除</UButton
          >
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { AdminPost, AdminNamedItem } from "~/types/admin"
import { http } from "~/composables/http"
import { formatChineseDateTime } from "~/utils/data"

definePageMeta({
  layout: "admin",
  middleware: "admin-auth"
})

// ─── 数据 ───────────────────────────────────────────────
const route = useRoute()
const router = useRouter()
const posts = ref<AdminPost[]>([])
const page = ref(Number(route.query.page) || 1)
const pagination = ref({ total: 0, limit: 10 })
const filters = reactive({ search: String(route.query.search || ""), category: Number(route.query.category) || 0, tag: Number(route.query.tag) || 0, status: route.query.status === undefined ? -1 : Number(route.query.status) })
const appliedFilters = ref({ ...filters })
const listError = ref("")
let listVersion = 0
const loading = ref(true)
const toast = useToast()

const columns = [
  { id: "index", key: "index", accessorKey: "index", header: "序号" },
  { id: "title", key: "title", accessorKey: "title", header: "标题" },
  { id: "status", key: "status", accessorKey: "status", header: "状态" },
  { id: "category", accessorKey: "category", header: "分类" },
  { id: "tags", accessorKey: "tags", header: "标签" },
  { id: "views", key: "views", accessorKey: "views", header: "浏览" },
  {
    id: "publish_time",
    key: "publish_time",
    accessorKey: "publish_time",
    header: "发布时间"
  },
  { id: "actions", key: "actions", accessorKey: "actions", header: "操作" }
]

// ─── 分类 / 标签 选项 ────────────────────────────────────
const categories = ref<AdminNamedItem[]>([])
const tags = ref<AdminNamedItem[]>([])

const categoryOptions = computed(() =>
  categories.value.map((c) => ({ label: c.name, value: c.id }))
)
const tagOptions = computed(() =>
  tags.value.map((t) => ({ label: t.name, value: t.id }))
)

const statusOptions = [
  { label: "草稿", value: 0 },
  { label: "已发布", value: 1 },
  { label: "已下线", value: 2 }
]

// ─── 弹窗状态 ────────────────────────────────────────────
const showDeleteModal = ref(false)
const deletingPost = ref<AdminPost | null>(null)
const deleting = ref(false)
// ─── 方法 ────────────────────────────────────────────────
async function fetchPosts() {
  const version = ++listVersion
  loading.value = true
  listError.value = ""
  try {
    const res = await http<{
      data: AdminPost[]
      pagination: { total: number; limit: number }
    }>({
      url: "/v1/posts",
      query: { page: page.value, limit: 10, search: appliedFilters.value.search || undefined, category: appliedFilters.value.category || undefined, tag: appliedFilters.value.tag || undefined, status: appliedFilters.value.status < 0 ? undefined : appliedFilters.value.status }
    })
    if (version !== listVersion) return
    posts.value = res.data || []
    pagination.value = res.pagination
    if (page.value > 1 && !posts.value.length) await onPageChange(Math.max(1, Math.ceil(res.pagination.total / res.pagination.limit)))
  } catch (e) {
    if (version === listVersion) { posts.value = []; listError.value = requestErrorMessage(e, "获取文章列表失败") }
  } finally {
    if (version === listVersion) loading.value = false
  }
}

async function fetchCategories() {
  try {
    categories.value = await allAdminItems<AdminNamedItem>("/v1/categories")
  } catch (error) {
    toast.add({ title: requestErrorMessage(error, "选项加载失败"), color: "error" })
  }
}

async function fetchTags() {
  try {
    tags.value = await allAdminItems<AdminNamedItem>("/v1/tags")
  } catch (error) {
    toast.add({ title: requestErrorMessage(error, "选项加载失败"), color: "error" })
  }
}

function openCreate() { return navigateTo("/admin/posts/new") }
function openEdit(post: Pick<AdminPost, "uuid">) { return navigateTo(`/admin/posts/${encodeURIComponent(post.uuid)}/edit`) }

function confirmDelete(post: AdminPost) {
  deletingPost.value = post
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingPost.value) return
  deleting.value = true
  try {
    await http({
      url: `/v1/posts/${deletingPost.value.uuid}`,
      method: "DELETE"
    })
    showDeleteModal.value = false
    deletingPost.value = null
    await fetchPosts()
  } catch (e) {
    toast.add({ title: requestErrorMessage(e, "删除文章失败，请重试"), color: "error" })
  } finally {
    deleting.value = false
  }
}

function formatDate(date: string) {
  return date ? formatChineseDateTime(date) : "—"
}

async function onPageChange(newPage: number) {
  page.value = newPage
  const active = appliedFilters.value
  await router.replace({ query: { page: newPage, ...(active.search ? { search: active.search } : {}), ...(active.category ? { category: active.category } : {}), ...(active.tag ? { tag: active.tag } : {}), ...(active.status >= 0 ? { status: active.status } : {}) } })
  await fetchPosts()
}
async function applyFilters() { appliedFilters.value = { ...filters, search: filters.search.trim() }; await onPageChange(1) }
async function resetFilters() { Object.assign(filters, { search: "", category: 0, tag: 0, status: -1 }); await applyFilters() }
watch(() => [route.query.page, route.query.search, route.query.category, route.query.tag, route.query.status], () => {
  const nextPage = Math.max(1, Number(route.query.page) || 1)
  const next = { search: String(route.query.search || ""), category: Number(route.query.category) || 0, tag: Number(route.query.tag) || 0, status: route.query.status === undefined ? -1 : Number(route.query.status) }
  if (nextPage !== page.value || JSON.stringify(next) !== JSON.stringify(appliedFilters.value)) {
    page.value = nextPage; Object.assign(filters, next); appliedFilters.value = next; fetchPosts()
  }
})

onMounted(async () => {
  await Promise.all([fetchPosts(), fetchCategories(), fetchTags()])
  if (typeof route.query.edit === "string") await openEdit({ uuid: route.query.edit })
})
</script>
