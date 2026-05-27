<template>
  <div class="flex flex-col h-[calc(100vh-5rem)]">
    <!-- 顶部 -->
    <div class="border-b px-4 py-3 space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">云剪贴板</h1>
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {{ entries.length }} 条</span>
          <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-arrow-path" @click="handleRefresh" />
        </div>
      </div>

      <!-- 类型筛选（服务端） -->
      <div class="flex gap-2 flex-wrap">
        <UButton
          v-for="tab in typeTabs"
          :key="tab.value"
          :variant="filterType === tab.value ? 'solid' : 'soft'"
          color="primary"
          size="xs"
          @click="switchType(tab.value)"
        >
          {{ tab.label }}
        </UButton>
      </div>

      <!-- 日期筛选（服务端） -->
      <div class="flex gap-2 flex-wrap items-center">
        <UButton
          v-for="d in dateTabs"
          :key="d.value"
          :variant="activeDateTab === d.value ? 'solid' : 'soft'"
          color="neutral"
          size="xs"
          @click="switchDate(d.value)"
        >
          {{ d.label }}
        </UButton>

        <!-- 自定义日期范围 -->
        <input
          v-model="customStart"
          type="date"
          class="h-8 rounded-md border px-2 text-xs bg-transparent"
          @change="applyCustomDate"
        />
        <span class="text-xs text-gray-400">至</span>
        <input
          v-model="customEnd"
          type="date"
          class="h-8 rounded-md border px-2 text-xs bg-transparent"
          @change="applyCustomDate"
        />
      </div>

      <!-- 搜索（服务端） -->
      <UInput
        v-model="searchQuery"
        placeholder="搜索文本内容..."
        class="w-full"
        leading-icon="i-heroicons-magnifying-glass"
        @keydown.enter="handleSearch"
      />
    </div>

    <!-- 消息列表 -->
    <div ref="scrollRef" class="flex-1 overflow-y-auto px-4 py-4 space-y-3" @scroll="onScroll">
      <div v-if="loading && entries.length === 0" class="text-center py-20 text-gray-400">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 mx-auto mb-2 animate-spin" />
        <p>加载中...</p>
      </div>

      <div v-else-if="entries.length === 0" class="text-center py-20 text-gray-400">
        <UIcon name="i-heroicons-clipboard-document-list" class="h-12 w-12 mx-auto mb-2" />
        <p>还没有任何内容</p>
        <p class="text-sm">从下方上传第一条</p>
      </div>

      <template v-else>
        <div v-if="loading" class="text-center py-2">
          <UIcon name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-gray-400" />
        </div>

        <div v-for="entry in entries" :key="entry.uuid" class="flex justify-end">
          <div class="relative w-full sm:max-w-[70%]">
            <div class="text-right text-xs text-gray-400 mb-1">{{ formatTime(entry.created_at) }}</div>

            <div class="rounded-2xl px-4 py-3 bg-primary text-primary-foreground break-words">
              <!-- 文本 -->
              <div v-if="entry.type === 'text'" class="whitespace-pre-wrap text-sm leading-relaxed">{{ entry.content }}</div>

              <!-- 图片 -->
              <div v-else-if="entry.type === 'image'" class="space-y-1">
                <img :src="entry.file_url" :alt="entry.file_name" class="max-w-full rounded-lg cursor-pointer hover:opacity-90" style="max-height:300px;object-fit:contain" @click="openPreview(entry.file_url)" />
                <div class="text-xs opacity-75 truncate">{{ entry.file_name }}</div>
              </div>

              <!-- 文件 -->
              <div v-else class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <UIcon name="i-heroicons-document" class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium truncate">{{ entry.file_name }}</div>
                  <div class="text-xs opacity-75">{{ formatSize(entry.file_size || 0) }}</div>
                </div>
                <a :href="entry.file_url" target="_blank" download>
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-heroicons-arrow-down-tray" class="text-white hover:text-white/80" />
                </a>
              </div>
            </div>

            <div class="flex justify-end gap-1 mt-1">
              <UButton color="neutral" variant="ghost" size="2xs" icon="i-heroicons-document-duplicate" title="复制" @click="handleCopy(entry)" />
              <UButton color="red" variant="ghost" size="2xs" icon="i-heroicons-trash" title="删除" @click="handleDelete(entry.uuid)" />
            </div>
          </div>
        </div>

        <div ref="bottomRef" />
      </template>
    </div>

    <!-- 图片预览 -->
    <UModal v-model:open="showPreview" fullscreen>
      <template #body>
        <div class="flex items-center justify-center h-full min-h-[80vh]">
          <img v-if="previewImage" :src="previewImage" class="max-w-full max-h-full object-contain p-4" alt="preview" />
        </div>
      </template>
    </UModal>

    <!-- 底部输入 -->
    <div class="border-t bg-background px-4 py-3">
      <div class="flex items-end gap-2">
        <div class="flex shrink-0 gap-1">
          <UButton color="neutral" variant="soft" size="sm" icon="i-heroicons-photo" title="上传图片" :disabled="uploading" @click="triggerUpload('image')" />
          <UButton color="neutral" variant="soft" size="sm" icon="i-heroicons-paper-clip" title="上传文件" :disabled="uploading" @click="triggerUpload('file')" />
        </div>
        <div class="flex-1">
          <UTextarea v-model="inputText" placeholder="输入内容，Enter 发送，Shift+Enter 换行" :rows="1" class="w-full resize-none" @keydown.enter.exact="handleSendText" @keydown.shift.enter="" @paste="handlePaste" />
        </div>
        <UButton color="primary" :loading="uploading" icon="i-heroicons-paper-airplane" class="shrink-0" @click="handleSendText" />
        <input ref="fileInputRef" type="file" class="hidden" :accept="uploadType === 'image' ? 'image/*' : '*/*'" @change="handleFileSelected" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" })

import { useClipboard } from "~/composables/useClipboard"

const {
  entries, loading, uploading, hasMore,
  loadMore, refresh,
  filterType, searchQuery,
  setDateRange, todayStr, daysAgoStr,
  uploadText, uploadFile, remove, copyToClipboard,
  formatTime, formatSize
} = useClipboard()

const toast = useToast()
const scrollRef = ref<HTMLElement>()
const bottomRef = ref<HTMLElement>()
const inputText = ref("")
const showPreview = ref(false)
const previewImage = ref("")
const fileInputRef = ref<HTMLInputElement>()
const uploadType = ref<"image" | "file">("file")
const activeDateTab = ref("all")
const customStart = ref("")
const customEnd = ref("")

const typeTabs = [
  { label: "全部", value: "" },
  { label: "文本", value: "text" },
  { label: "图片", value: "image" },
  { label: "文件", value: "file" },
]

const dateTabs = [
  { label: "全部", value: "all" },
  { label: "今天", value: "today" },
  { label: "最近 3 天", value: "3d" },
  { label: "最近 7 天", value: "7d" },
  { label: "最近 30 天", value: "30d" },
]

async function switchType(val: string) {
  filterType.value = val
  await doRefresh()
}

async function switchDate(val: string) {
  activeDateTab.value = val
  customStart.value = ""
  customEnd.value = ""
  if (val === "all") {
    setDateRange("", "")
  } else if (val === "today") {
    const t = todayStr()
    setDateRange(t, t)
  } else {
    const days = val === "3d" ? 3 : val === "7d" ? 7 : 30
    setDateRange(daysAgoStr(days), todayStr())
  }
  await doRefresh()
}

function applyCustomDate() {
  if (!customStart.value && !customEnd.value) return
  activeDateTab.value = ""
  setDateRange(customStart.value || "", customEnd.value || customStart.value)
  doRefresh()
}

async function handleSearch() {
  await doRefresh()
}

async function doRefresh() {
  await refresh()
  scrollToBottom()
}

// ─── 上传 ───────────────────────────────────────
function triggerUpload(type: "image" | "file") {
  uploadType.value = type
  fileInputRef.value?.click()
}

async function handleFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 50 * 1024 * 1024) {
    toast.add({ title: "文件不能超过 50MB", color: "red" }); return
  }
  const res = await uploadFile(file)
  if (res) { toast.add({ title: "上传成功", color: "green" }); scrollToBottom() }
  else toast.add({ title: "上传失败", color: "red" })
  input.value = ""
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        const r = await uploadFile(file)
        if (r) toast.add({ title: "图片已上传", color: "green" })
        else toast.add({ title: "上传失败", color: "red" })
      }
      return
    }
  }
}

async function handleSendText() {
  const text = inputText.value.trim()
  if (!text || uploading.value) return
  inputText.value = ""
  const res = await uploadText(text)
  if (res) scrollToBottom()
}

async function handleCopy(entry: any) {
  await copyToClipboard(entry)
  toast.add({ title: "已复制", color: "green" })
}

async function handleDelete(uuid: string) {
  await remove(uuid)
  toast.add({ title: "已删除", color: "green" })
}

function openPreview(url: string) {
  previewImage.value = url
  showPreview.value = true
}

function scrollToBottom() {
  nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight })
}

function onScroll() {
  const el = scrollRef.value
  if (!el || loading.value || !hasMore.value) return
  if (el.scrollTop < 100) {
    const prevHeight = el.scrollHeight
    loadMore().then(() => {
      nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight - prevHeight })
    })
  }
}

async function handleRefresh() {
  filterType.value = ""
  searchQuery.value = ""
  activeDateTab.value = "all"
  customStart.value = ""
  customEnd.value = ""
  setDateRange("", "")
  await refresh()
  scrollToBottom()
}

onMounted(async () => {
  await loadMore()
  scrollToBottom()
})
</script>

<style scoped>
.overflow-y-auto::-webkit-scrollbar { width: 4px; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
.dark .overflow-y-auto::-webkit-scrollbar-thumb { background: #4b5563; }
</style>
