<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">分类管理</h1>
      <UButton color="primary" icon="i-heroicons-plus" @click="showModal = true">
        新建分类
      </UButton>
    </div>

    <UCard>
      <UTable
        :rows="categories"
        :columns="columns"
        :loading="loading"
        :empty-state="{ icon: 'i-heroicons-tag', label: '暂无分类' }"
      >
        <template #actions="{ row }">
          <div class="flex gap-1">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-pencil-square"
              @click="editItem(row)"
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
    </UCard>

    <!-- 新建/编辑弹窗 -->
    <UModal v-model:open="showModal">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">{{ editingItem ? '编辑分类' : '新建分类' }}</h2>
        </template>

        <UForm :state="form" class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="closeModal">取消</UButton>
            <UButton color="primary" :loading="saving" @click="save">保存</UButton>
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

const categories = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)

const showModal = ref(false)
const showDeleteModal = ref(false)
const editingItem = ref<any>(null)
const deletingItem = ref<any>(null)

const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "名称" },
  { key: "actions", label: "操作" },
]

const form = reactive({ name: "" })

async function fetchData() {
  loading.value = true
  try {
    const res = await http<any[]>({ url: "/v1/categories" })
    categories.value = res || []
  } catch (e) {
    console.error("获取分类失败", e)
  } finally {
    loading.value = false
  }
}

function editItem(item: any) {
  editingItem.value = item
  form.name = item.name
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
  form.name = ""
}

async function save() {
  if (!form.name) return
  saving.value = true
  try {
    const url = editingItem.value ? `/v1/categories/${editingItem.value.id}` : "/v1/categories"
    const method = editingItem.value ? ("PUT" as const) : ("POST" as const)
    await http({ url, method, body: { name: form.name } })
    closeModal()
    await fetchData()
  } catch (e) {
    console.error("保存分类失败", e)
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
    await http({ url: `/v1/categories/${deletingItem.value.id}`, method: "DELETE" })
    showDeleteModal.value = false
    deletingItem.value = null
    await fetchData()
  } catch (e) {
    console.error("删除分类失败", e)
  } finally {
    deleting.value = false
  }
}

onMounted(fetchData)
</script>
