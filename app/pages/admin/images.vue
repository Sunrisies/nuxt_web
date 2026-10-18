<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">图片管理</h1>
      <input ref="fileInput" type="file" class="hidden" accept="image/png,image/jpeg,image/webp" aria-label="上传图片文件" @change="upload">
      <UButton icon="i-heroicons-arrow-up-tray" :loading="uploading" @click="fileInput?.click()">上传图片</UButton>
    </div>
    <UAlert class="mb-4" title="图片删除保护" description="正文或封面仍在使用的图片不能删除，草稿和已下线文章同样受保护。请先移除文章中的引用并保存。" />
    <form class="mb-4 flex flex-wrap gap-2" @submit.prevent="searchImages">
      <UInput v-model="search" aria-label="图片文件名搜索" placeholder="按文件名搜索" :maxlength="100" class="w-full sm:w-72" />
      <UButton type="submit" :loading="loading">搜索</UButton>
      <UButton variant="outline" @click="resetSearch">重置</UButton>
    </form>
    <UAlert v-if="error" class="mb-4" color="error" :title="error">
      <template #actions><UButton variant="outline" @click="load">重试</UButton></template>
    </UAlert>
    <UCard>
      <p class="mb-4 text-sm text-gray-500">共 {{ total }} 张图片</p>
      <p v-if="loading" role="status">正在加载图片…</p>
      <p v-else-if="!images.length && !error" class="py-8 text-center text-gray-500">暂无匹配图片</p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="image in images" :key="image.id" class="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-zinc-700" :aria-label="image.filename">
          <button class="block h-40 w-full rounded bg-gray-100 dark:bg-zinc-800" :aria-label="`预览 ${image.filename}`" @click="showDetails(image)">
            <NuxtImg :src="image.url" :alt="image.filename" loading="lazy" class="h-full w-full object-contain" />
          </button>
          <p class="mt-3 truncate font-medium" :title="image.filename">{{ image.filename }}</p>
          <p class="my-2 text-xs text-gray-500">{{ image.human_readable_size }} · {{ formatImageDate(image.created_at) }}</p>
          <UBadge :color="image.reference_count ? 'warning' : 'neutral'" variant="subtle">{{ image.reference_count ? `${image.reference_count} 篇文章引用` : '未被文章引用' }}</UBadge>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton size="sm" variant="outline" @click="showDetails(image)">详情与引用</UButton>
            <UButton size="sm" variant="outline" @click="copyUrl(image)">复制地址</UButton>
            <UButton size="sm" color="error" variant="outline" :disabled="image.reference_count > 0" @click="askDelete(image)">删除</UButton>
          </div>
        </article>
      </div>
      <div v-if="total" class="mt-6 flex justify-center overflow-x-auto">
        <UPagination :page="page" :items-per-page="limit" :total="total" @update:page="changePage" />
      </div>
    </UCard>
    <UModal v-model:open="detailOpen" title="图片详情与引用" :ui="{ content: 'sm:max-w-3xl', body: 'overflow-y-auto' }">
      <template #body>
        <p v-if="detailLoading" role="status">正在检查最新引用…</p>
        <UAlert v-if="detailError" color="error" :title="detailError" />
        <div v-if="selected" class="space-y-4">
          <NuxtImg :src="selected.url" :alt="selected.filename" class="max-h-80 w-full object-contain" />
          <p class="break-all font-medium">{{ selected.filename }}</p>
          <p class="break-all text-sm">{{ selected.url }}</p>
          <p>{{ selected.human_readable_size }} · {{ selected.reference_count }} 篇文章引用</p>
          <p v-if="!selected.reference_count">未被已保存的文章引用。未保存的编辑内容不计入引用。</p>
          <ul class="space-y-3">
            <li v-for="reference in selected.references" :key="reference.uuid" class="rounded border border-gray-200 p-3 dark:border-zinc-700">
              <NuxtLink :to="{ path: '/admin/posts', query: { edit: reference.uuid } }" class="text-primary underline">{{ reference.title }}</NuxtLink>
              <p class="mt-1 text-sm">{{ statusName(reference.status) }} · {{ [reference.body ? '正文' : '', reference.cover ? '封面' : ''].filter(Boolean).join('、') }}</p>
            </li>
          </ul>
        </div>
      </template>
    </UModal>
    <UModal v-model:open="deleteOpen" title="确认删除图片" :dismissible="!deleting">
      <template #body>
        <p class="break-all">确定删除「{{ pendingDelete?.filename }}」吗？文件会从存储中删除，无法恢复。</p>
        <UAlert v-if="deleteError" class="mt-4" color="error" :title="deleteError" />
      </template>
      <template #footer>
        <UButton variant="outline" :disabled="deleting" @click="deleteOpen = false">取消</UButton>
        <UButton color="error" :loading="deleting" @click="removeImage">确认删除</UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { AdminImage, AdminList } from "~/types/admin"
import { http } from "~/composables/http"

definePageMeta({ layout: "admin", middleware: "admin-auth" })
const route = useRoute()
const router = useRouter()
const toast = useToast()
const images = ref<AdminImage[]>([])
const page = ref(Math.max(1, Number(route.query.page) || 1))
const search = ref(String(route.query.search || ""))
const appliedSearch = ref(search.value)
const limit = 12
const total = ref(0)
const loading = ref(false)
const error = ref("")
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()
const selected = ref<AdminImage | null>(null)
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref("")
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref("")
const pendingDelete = ref<AdminImage | null>(null)
let loadVersion = 0
let detailVersion = 0
const formatImageDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(date)
}
const statusName = (status: number) => ["草稿", "已发布", "已下线"][status] || "未知状态"

async function load() {
  const version = ++loadVersion
  loading.value = true
  error.value = ""
  try {
    const result = await http<AdminList<AdminImage>>({ url: "/v1/images", query: { page: page.value, limit, search: appliedSearch.value || undefined } })
    if (version !== loadVersion) return
    images.value = result.data
    total.value = result.pagination.total
    if (page.value > 1 && !images.value.length) await changePage(Math.max(1, Math.ceil(total.value / limit)))
  } catch (e) {
    if (version === loadVersion) { images.value = []; error.value = requestErrorMessage(e, "图片加载失败") }
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
async function syncRoute() {
  await router.replace({ query: { page: page.value, ...(appliedSearch.value ? { search: appliedSearch.value } : {}) } })
}
async function changePage(value: number) { page.value = value; await syncRoute(); await load() }
async function searchImages() { appliedSearch.value = search.value.trim(); await changePage(1) }
async function resetSearch() { search.value = ""; await searchImages() }
async function showDetails(image: AdminImage) {
  const version = ++detailVersion
  selected.value = null
  detailError.value = ""
  detailLoading.value = true
  detailOpen.value = true
  try {
    const result = await http<AdminImage>({ url: `/v1/images/${image.id}` })
    if (version === detailVersion) selected.value = result
  } catch (e) {
    if (version === detailVersion) detailError.value = requestErrorMessage(e, "图片详情加载失败")
  } finally { if (version === detailVersion) detailLoading.value = false }
}
async function copyUrl(image: AdminImage) {
  try { await navigator.clipboard.writeText(new URL(image.url, window.location.origin).href); toast.add({ title: "图片地址已复制", color: "success" }) }
  catch { toast.add({ title: "复制失败，可在详情中手动复制地址", color: "error" }) }
}
function askDelete(image: AdminImage) { pendingDelete.value = image; deleteError.value = ""; deleteOpen.value = true }
async function removeImage() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  deleteError.value = ""
  try {
    await http({ url: `/v1/images/${pendingDelete.value.id}`, method: "DELETE", timeout: 30000 })
    deleteOpen.value = false
    toast.add({ title: "图片已删除", color: "success" })
    await load()
  } catch (e) {
    deleteError.value = requestErrorMessage(e, "图片删除失败，记录已保留")
    await load()
  } finally { deleting.value = false }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    toast.add({ title: "请选择不超过 10MB 的 PNG、JPG 或 WebP 图片", color: "error" }); input.value = ""; return
  }
  uploading.value = true
  try {
    const body = new FormData(); body.append("file", file)
    await http({ url: "/v1/images/upload", method: "POST", body, timeout: 60000 })
    search.value = ""; appliedSearch.value = ""
    await changePage(1)
    toast.add({ title: "图片上传成功", color: "success" })
  } catch (e) { toast.add({ title: requestErrorMessage(e, "图片上传失败"), color: "error" }) }
  finally { uploading.value = false; input.value = "" }
}
watch(() => [route.query.page, route.query.search], () => {
  const nextPage = Math.max(1, Number(route.query.page) || 1)
  const nextSearch = String(route.query.search || "")
  if (nextPage !== page.value || nextSearch !== appliedSearch.value) {
    page.value = nextPage; search.value = nextSearch; appliedSearch.value = nextSearch; load()
  }
})
onMounted(load)
</script>
