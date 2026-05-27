<template>
  <div class="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col">
    <!-- 未登录：频道输入 -->
    <template v-if="!loggedIn">
      <div class="flex-1 flex items-center justify-center px-4">
        <UCard class="w-full max-w-sm">
          <template #header>
            <div class="text-center">
              <UIcon name="i-heroicons-clipboard-document-list" class="h-10 w-10 mx-auto mb-2 text-primary" />
              <h1 class="text-xl font-bold">云剪贴板</h1>
              <p class="text-sm text-gray-500 mt-1">输入频道名称和密码进入</p>
            </div>
          </template>

          <UForm :state="form" class="space-y-4" @submit="handleEnter">
            <UFormField label="频道名称" required>
              <UInput v-model="form.name" placeholder="输入频道名称" class="w-full" />
            </UFormField>
            <UFormField label="密码" required>
              <UInput v-model="form.password" type="password" placeholder="输入频道密码" class="w-full" />
            </UFormField>

            <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

            <UButton type="submit" color="primary" block :loading="authLoading">进入频道</UButton>
          </UForm>
        </UCard>
      </div>
    </template>

    <!-- 已登录：剪贴板界面 -->
    <template v-else>
      <div class="flex flex-col h-screen">
        <div class="border-b bg-white dark:bg-zinc-950 px-4 py-3 space-y-3">
          <div class="flex items-center justify-between">
            <h1 class="text-lg font-bold">云剪贴板</h1>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <span>共 {{ entries.length }} 条</span>
              <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-arrow-right-end-on-rectangle" title="退出频道" @click="handleLeave" />
            </div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <UButton v-for="tab in typeTabs" :key="tab.value" :variant="filterType === tab.value ? 'solid' : 'soft'" color="primary" size="xs" @click="switchFilter(tab.value)">{{ tab.label }}</UButton>
          </div>
          <div class="flex gap-2 flex-wrap items-center">
            <UButton v-for="d in dateTabs" :key="d.value" :variant="activeDateTab === d.value ? 'solid' : 'soft'" color="neutral" size="xs" @click="switchDate(d.value)">{{ d.label }}</UButton>
            <input v-model="customStart" type="date" class="h-8 rounded-md border px-2 text-xs bg-transparent" @change="applyCustomDate" />
            <span class="text-xs text-gray-400">至</span>
            <input v-model="customEnd" type="date" class="h-8 rounded-md border px-2 text-xs bg-transparent" @change="applyCustomDate" />
          </div>
          <UInput v-model="searchQuery" placeholder="搜索文本内容..." class="w-full" leading-icon="i-heroicons-magnifying-glass" @keydown.enter="doRefresh" />
        </div>

        <div ref="scrollRef" class="flex-1 overflow-y-auto px-4 py-4 space-y-3" @scroll="onScroll">
          <div v-if="loading && entries.length === 0" class="text-center py-20 text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 mx-auto mb-2 animate-spin" /><p>加载中...</p>
          </div>
          <div v-else-if="entries.length === 0" class="text-center py-20 text-gray-400">
            <UIcon name="i-heroicons-clipboard-document-list" class="h-12 w-12 mx-auto mb-2" /><p>还没有任何内容</p><p class="text-sm">从下方上传第一条</p>
          </div>
          <template v-else>
            <div v-if="loading" class="text-center py-2"><UIcon name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-gray-400" /></div>
            <div v-for="entry in entries" :key="entry.uuid" class="flex justify-end">
              <div class="relative w-full sm:max-w-[70%]">
                <div class="text-right text-xs text-gray-400 mb-1">{{ formatClipboardTime(entry.created_at) }}</div>
                <div class="rounded-2xl px-4 py-3 bg-primary text-primary-foreground break-words">
                  <div v-if="entry.type === 'text'" class="whitespace-pre-wrap text-sm leading-relaxed">{{ entry.content }}</div>
                  <div v-else-if="entry.type === 'image'" class="space-y-1">
                    <img :src="entry.file_url" :alt="entry.file_name" class="max-w-full rounded-lg cursor-pointer hover:opacity-90" style="max-height:300px;object-fit:contain" @click="openPreview(entry.file_url!)" />
                    <div class="text-xs opacity-75 truncate">{{ entry.file_name }}</div>
                  </div>
                  <div v-else class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20"><UIcon name="i-heroicons-document" class="h-5 w-5" /></div>
                    <div class="min-w-0 flex-1"><div class="text-sm font-medium truncate">{{ entry.file_name }}</div><div class="text-xs opacity-75">{{ formatClipboardSize(entry.file_size || 0) }}</div></div>
                    <a :href="entry.file_url" target="_blank" download><UButton color="neutral" variant="ghost" size="xs" icon="i-heroicons-arrow-down-tray" class="text-white hover:text-white/80" /></a>
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

        <UModal v-model:open="showPreview" fullscreen>
          <template #body><div class="flex items-center justify-center h-full min-h-[80vh]"><img v-if="previewImage" :src="previewImage" class="max-w-full max-h-full object-contain p-4" alt="preview" /></div></template>
        </UModal>

        <div class="border-t bg-white dark:bg-zinc-950 px-4 py-3">
          <div class="flex items-end gap-2">
            <div class="flex shrink-0 gap-1">
              <UButton color="neutral" variant="soft" size="sm" icon="i-heroicons-photo" :disabled="uploading" @click="triggerUpload('image')" />
              <UButton color="neutral" variant="soft" size="sm" icon="i-heroicons-paper-clip" :disabled="uploading" @click="triggerUpload('file')" />
            </div>
            <div class="flex-1"><UTextarea v-model="inputText" placeholder="输入内容，Enter 发送" :rows="1" class="w-full resize-none" @keydown.enter.exact="handleSendText" @paste="handlePaste" /></div>
            <UButton color="primary" :loading="uploading" icon="i-heroicons-paper-airplane" class="shrink-0" @click="handleSendText" />
            <input ref="fileInputRef" type="file" class="hidden" :accept="uploadType === 'image' ? 'image/*' : '*/*'" @change="handleFileSelected" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { hasToken, getStoredToken, setStoredToken, clearToken, authChannel } from "~/composables/useClipboard"
import { fetchClipboardList, uploadClipboardText, uploadClipboardFile, deleteClipboardEntry } from "~/composables/useClipboard"
import { formatClipboardTime, formatClipboardSize, todayStr, daysAgoStr } from "~/composables/useClipboard"
import type { ClipboardEntry } from "~/types/clipboard"

const loggedIn = ref(hasToken())
const form = reactive({ name: "", password: "" })
const authLoading = ref(false)
const errorMsg = ref("")

async function handleEnter() {
  if (!form.name || !form.password) { errorMsg.value = "请输入频道名称和密码"; return }
  authLoading.value = true; errorMsg.value = ""
  const token = await authChannel(form.name, form.password)
  if (!token) { errorMsg.value = "频道名或密码错误"; authLoading.value = false; return }
  setStoredToken(token)
  loggedIn.value = true
  await loadInitialData()
  scrollToBottom()
  authLoading.value = false
}

function handleLeave() { clearToken(); loggedIn.value = false; entries.value = [] }

// ─── 剪贴板 ─────────────────────────────────────────
const entries = ref<ClipboardEntry[]>([])
const loading = ref(false)
const uploading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const limit = 20
const filterType = ref("")
const searchQuery = ref("")
const activeDateTab = ref("all")
const customStart = ref("")
const customEnd = ref("")
const typeTabs = [
  { label: "全部", value: "" }, { label: "文本", value: "text" },
  { label: "图片", value: "image" }, { label: "文件", value: "file" },
]
const dateTabs = [
  { label: "全部", value: "all" }, { label: "今天", value: "today" },
  { label: "最近 3 天", value: "3d" }, { label: "最近 7 天", value: "7d" },
  { label: "最近 30 天", value: "30d" },
]
const scrollRef = ref<HTMLElement>()
const bottomRef = ref<HTMLElement>()
const inputText = ref("")
const showPreview = ref(false)
const previewImage = ref("")
const fileInputRef = ref<HTMLInputElement>()
const uploadType = ref<"image" | "file">("file")

function buildFilter() {
  let start = "", end = ""
  if (activeDateTab.value === "today") { const t = todayStr(); start = t; end = t }
  else if (activeDateTab.value === "3d") { start = daysAgoStr(3); end = todayStr() }
  else if (activeDateTab.value === "7d") { start = daysAgoStr(7); end = todayStr() }
  else if (activeDateTab.value === "30d") { start = daysAgoStr(30); end = todayStr() }
  else if (customStart.value) { start = customStart.value; end = customEnd.value || customStart.value }
  return { type: filterType.value, q: searchQuery.value, start, end }
}

async function loadInitialData() {
  page.value = 1; hasMore.value = true; entries.value = []
  const f = buildFilter()
  const res = await fetchClipboardList(1, limit, f.type, f.q, f.start, f.end)
  if (res) { entries.value = (res.data || []).reverse(); hasMore.value = (res.pagination?.total || 0) > entries.value.length; page.value = 2 }
}

async function loadMore() {
  if (loading.value || !hasMore.value) return; loading.value = true
  const f = buildFilter()
  const res = await fetchClipboardList(page.value, limit, f.type, f.q, f.start, f.end)
  if (res) { entries.value = [...(res.data || []).reverse(), ...entries.value]; hasMore.value = (res.pagination?.total || 0) > entries.value.length; page.value++ }
  else hasMore.value = false
  loading.value = false
}

async function doRefresh() { await loadInitialData(); scrollToBottom() }
async function switchFilter(val: string) { filterType.value = val; await doRefresh() }
async function switchDate(val: string) { activeDateTab.value = val; customStart.value = ""; customEnd.value = ""; await doRefresh() }
function applyCustomDate() { if (customStart.value) { activeDateTab.value = ""; doRefresh() } }
function triggerUpload(type: "image" | "file") { uploadType.value = type; fileInputRef.value?.click() }

async function handleFileSelected(e: Event) {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]
  if (!file) return
  if (file.size > 50 * 1024 * 1024) { toast.add({ title: "文件不能超过 50MB", color: "red" }); return }
  uploading.value = true
  const res = await uploadClipboardFile(file)
  if (res) { entries.value.push(res); scrollToBottom() }; uploading.value = false; input.value = ""
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items; if (!items) return
  for (const item of items) {
    if (item.type.startsWith("image/")) { e.preventDefault(); const file = item.getAsFile(); if (file) { uploading.value = true; const r = await uploadClipboardFile(file); if (r) entries.value.push(r); uploading.value = false } }; return
  }
}

async function handleSendText() {
  const text = inputText.value.trim(); if (!text || uploading.value) return
  inputText.value = ""; uploading.value = true
  const res = await uploadClipboardText(text)
  if (res) { entries.value.push(res); scrollToBottom() }; uploading.value = false
}

async function handleCopy(entry: ClipboardEntry) {
  const text = entry.type === "text" ? entry.content || "" : entry.file_url || ""
  try { await navigator.clipboard.writeText(text) } catch { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta) }
  toast.add({ title: "已复制", color: "green" })
}

async function handleDelete(uuid: string) {
  const ok = await deleteClipboardEntry(uuid)
  if (ok) { entries.value = entries.value.filter((e) => e.uuid !== uuid); toast.add({ title: "已删除", color: "green" }) }
}

function openPreview(url: string) { previewImage.value = url; showPreview.value = true }
function scrollToBottom() { nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight }) }
function onScroll() {
  const el = scrollRef.value; if (!el || loading.value || !hasMore.value) return
  if (el.scrollTop < 100) { const prev = el.scrollHeight; loadMore().then(() => { nextTick(() => { if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight - prev }) }) }
}
const toast = useToast()
</script>
<style scoped>
.overflow-y-auto::-webkit-scrollbar { width: 4px; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
.dark .overflow-y-auto::-webkit-scrollbar-thumb { background: #4b5563; }
</style>
