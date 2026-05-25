<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">链接管理</h1>
      <UButton color="primary" icon="i-heroicons-plus" @click="openCreate">
        新建链接
      </UButton>
    </div>

    <UCard>
      <UTable
        :rows="links"
        :columns="columns"
        :loading="loading"
        :empty-state="{ icon: 'i-heroicons-link', label: '暂无链接' }"
      >
        <template #name="{ row }">
          <div class="flex items-center gap-2">
            <img
              v-if="row.icon"
              :src="row.icon"
              :alt="row.name"
              class="h-5 w-5 rounded object-contain"
              @error="($event.target as HTMLImageElement).style.display='none'"
            />
            <span>{{ row.name }}</span>
          </div>
        </template>
        <template #url="{ row }">
          <a
            :href="row.url"
            target="_blank"
            rel="noreferrer"
            class="text-sm text-primary hover:underline truncate block max-w-[200px]"
          >
            {{ row.url }}
          </a>
        </template>
        <template #created_at="{ row }">
          <span class="text-sm text-gray-500">{{ formatDate(row.created_at) }}</span>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-1">
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
          @update:page="fetchData"
        />
      </div>
    </UCard>

    <!-- 新建/编辑弹窗 -->
    <UModal v-model="showFormModal">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">{{ editingItem ? '编辑链接' : '新建链接' }}</h2>
        </template>

        <UForm :state="form" class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="form.name" placeholder="站点名称" class="w-full" />
          </UFormField>

          <UFormField label="链接地址" required>
            <UInput v-model="form.url" placeholder="https://..." class="w-full" />
          </UFormField>

          <UFormField label="描述">
            <UInput v-model="form.description" placeholder="简短描述" class="w-full" />
          </UFormField>

          <UFormField label="图标 URL">
            <UInput v-model="form.icon" placeholder="https://.../icon.png" class="w-full" />
          </UFormField>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="closeForm">取消</UButton>
            <UButton color="primary" :loading="saving" @click="save">保存</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- 删除确认 -->
    <UModal v-model="showDeleteModal">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">确认删除</h2>
        </template>
        <p>确定要删除「{{ deletingItem?.name }}」吗？</p>
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

const links = ref<any[]>([])
const page = ref(1)
const pagination = ref({ total: 0, limit: 10 })
const loading = ref(true)

const columns = [
  { id: "name",       key: "name",       label: "名称" },
  { id: "url",        key: "url",        label: "链接" },
  { id: "created_at", key: "created_at", label: "创建时间" },
  { id: "actions",    key: "actions",    label: "操作" },
]

const showFormModal = ref(false)
const showDeleteModal = ref(false)
const editingItem = ref<any>(null)
const deletingItem = ref<any>(null)
const saving = ref(false)
const deleting = ref(false)

const form = reactive({
  name: "",
  url: "",
  description: "",
  icon: "",
})

async function fetchData() {
  loading.value = true
  try {
    const res = await http<{ data: any[], pagination: { total: number, limit: number } }>({
      url: `/v1/links?page=${page.value}&limit=10`
    })
    links.value = res.data || []
    pagination.value = res.pagination
  } catch (e) {
    console.error("获取链接失败", e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingItem.value = null
  form.name = ""
  form.url = ""
  form.description = ""
  form.icon = ""
  showFormModal.value = true
}

function openEdit(item: any) {
  editingItem.value = item
  form.name = item.name || ""
  form.url = item.url || ""
  form.description = item.description || ""
  form.icon = item.icon || ""
  showFormModal.value = true
}

function closeForm() {
  showFormModal.value = false
  editingItem.value = null
}

async function save() {
  if (!form.name || !form.url) return
  saving.value = true
  try {
    const body = { name: form.name, url: form.url, description: form.description, icon: form.icon }
    if (editingItem.value) {
      await http({ url: `/v1/links/${editingItem.value.id}`, method: "PUT", body })
    } else {
      await http({ url: "/v1/links", method: "POST", body })
    }
    closeForm()
    await fetchData()
  } catch (e) {
    console.error("保存链接失败", e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(item: any) {
  deletingItem.value = item
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await http({ url: `/v1/links/${deletingItem.value.id}`, method: "DELETE" })
    showDeleteModal.value = false
    deletingItem.value = null
    await fetchData()
  } catch (e) {
    console.error("删除链接失败", e)
  } finally {
    deleting.value = false
  }
}

function formatDate(date: string) {
  return date ? formatChineseDateTime(date) : "—"
}

onMounted(fetchData)
</script>
