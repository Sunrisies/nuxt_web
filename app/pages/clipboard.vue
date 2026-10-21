<template>
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
    <header class="mb-8 text-center">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UIcon name="i-heroicons-inbox-arrow-down" class="h-7 w-7" />
      </div>
      <h1 class="text-2xl font-bold">临时文件箱</h1>
      <p class="mt-2 text-sm text-muted">免登录可发送文本；登录后也可传图片、音频和视频。内容 24 小时后自动失效。</p>
    </header>

    <UCard class="mb-6">
      <div class="space-y-4">
        <UFormField label="文本内容">
          <UTextarea v-model="textContent" :rows="5" :maxlength="100000" placeholder="粘贴需要在另一台设备取用的文本" class="w-full" />
          <template #hint>{{ textContent.length }}/100000</template>
        </UFormField>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-muted">{{ loggedIn ? "支持文本及图片、音频、视频文件（最大 100 MB）" : "也可上传 .txt、.md、.log、.json、.csv 等文本文件（最大 10 MB）" }}</p>
          <div class="flex gap-2">
            <UButton color="neutral" variant="soft" icon="i-heroicons-document-arrow-up" :loading="uploadingFile" @click="fileInput?.click()">{{ loggedIn ? "选择文件" : "选择文本文件" }}</UButton>
            <UButton icon="i-heroicons-paper-airplane" :disabled="!textContent.trim()" :loading="uploadingText" @click="sendText">生成取件码</UButton>
          </div>
        </div>
        <input ref="fileInput" type="file" :accept="fileAccept" class="hidden" @change="uploadFile">
      </div>
    </UCard>

    <UCard class="mb-6">
      <div class="flex flex-col gap-3 sm:flex-row">
        <UInput v-model="pickupCode" inputmode="numeric" maxlength="8" placeholder="输入 8 位取件码下载文件" class="min-w-0 flex-1" @keydown.enter="pickup" />
        <UButton icon="i-heroicons-arrow-down-tray" :disabled="!pickupCode.trim()" @click="pickup">取件下载</UButton>
      </div>
    </UCard>

    <UCard v-if="created.length" class="mb-6">
      <template #header><h2 class="font-semibold">已生成的取件信息</h2></template>
      <div class="space-y-4">
        <div v-for="item in created" :key="item.id" class="rounded-lg border p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0"><p class="truncate font-medium">{{ item.name }}</p><p class="mt-1 text-xs text-muted">{{ item.kind }} · {{ prettySize(item.size) }} · 有效至 {{ formatExpiry(item.expiresAt) }}</p></div>
            <UButton size="sm" variant="soft" icon="i-heroicons-clipboard-document" @click="copyLink(item)">复制取件链接</UButton>
          </div>
          <div class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <code class="break-all rounded bg-muted px-3 py-2 text-xs">{{ item.code }}</code>
            <UButton size="sm" variant="outline" icon="i-heroicons-arrow-down-tray" :to="downloadUrl(item)" target="_blank">浏览器取件</UButton>
          </div>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p class="break-all text-xs text-muted">终端下载：<code>curl -L "{{ downloadUrl(item) }}" -o "{{ shellName(item.name) }}"</code></p>
            <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-clipboard" @click="copyCommand(item)">复制命令</UButton>
          </div>
        </div>
      </div>
    </UCard>

    <section v-if="items.length" class="space-y-3">
      <div class="flex items-center justify-between"><h2 class="font-semibold">本设备最近创建</h2><UButton size="xs" color="neutral" variant="ghost" @click="clearItems">清空列表</UButton></div>
      <div v-for="item in items" :key="item.id" class="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 dark:bg-zinc-950">
        <div class="min-w-0"><p class="truncate text-sm font-medium">{{ item.name }}</p><p class="text-xs text-muted">取件码 {{ item.code }} · 有效至 {{ formatExpiry(item.expiresAt) }}</p></div>
        <UButton size="xs" variant="soft" icon="i-heroicons-arrow-down-tray" :to="downloadUrl(item)" target="_blank">下载</UButton>
      </div>
    </section>
    <p class="mt-auto pt-8 text-center text-xs text-muted">取件码同时也是下载凭证，请只分享给需要接收的人。链接过期后文件会自动清理。</p>
  </main>
</template>

<script setup lang="ts">
interface DropItem { id: string; code: string; name: string; kind: string; size: number; expiresAt: string; }
const API = "/api/v1/drop"
const STORAGE = "sunrise-drop-items-v1"
const textContent = ref("")
const pickupCode = ref("")
const fileInput = ref<HTMLInputElement>()
const uploadingText = ref(false)
const uploadingFile = ref(false)
const loggedIn = ref(false)
const items = ref<DropItem[]>([])
const created = ref<DropItem[]>([])
const toast = useToast()
const fileAccept = computed(() => loggedIn.value
  ? ".txt,.md,.markdown,.log,.json,.csv,.yaml,.yml,.xml,.html,.css,.js,.ts,.py,.rs,.sh,.toml,.ini,.conf,.sql,image/*,audio/*,video/*"
  : ".txt,.md,.markdown,.log,.json,.csv,.yaml,.yml,.xml,.html,.css,.js,.ts,.py,.rs,.sh,.toml,.ini,.conf,.sql,text/*,application/json")

function readItems(): DropItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE) || "[]") as DropItem[] } catch { return [] }
}
onMounted(async () => {
  items.value = readItems().filter(item => Date.parse(item.expiresAt) > Date.now())
  try { loggedIn.value = await useAdminSession().check() } catch { loggedIn.value = false }
})
function persist(item: DropItem) { items.value = [item, ...items.value.filter(value => value.id !== item.id)].slice(0, 20); localStorage.setItem(STORAGE, JSON.stringify(items.value)); created.value = [item, ...created.value] }
function prettySize(bytes: number) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB` }
function shellName(value: string) { return value.replace(/["\\$`]/g, "_") }
function downloadUrl(item: DropItem) { return `${window.location.origin}/api/v1/drop/${encodeURIComponent(item.code)}` }
function formatExpiry(value: string) { return new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) }
function pickup() { const code = pickupCode.value.trim(); if (!/^\d{8}$/.test(code)) { toast.add({ title: "请输入 8 位数字取件码", color: "error" }); return }; window.location.assign(`${window.location.origin}/api/v1/drop/${encodeURIComponent(code)}`) }
async function copy(value: string) { await navigator.clipboard.writeText(value); toast.add({ title: "已复制", color: "success" }) }
async function copyLink(item: DropItem) { await copy(downloadUrl(item)) }
async function copyCommand(item: DropItem) { await copy(`curl -L "${downloadUrl(item)}" -o "${shellName(item.name)}"`) }
function clearItems() { items.value = []; localStorage.removeItem(STORAGE); toast.add({ title: "本机记录已清除", color: "success" }) }
async function sendText() {
  const content = textContent.value.trim()
  if (!content || uploadingText.value) return
  uploadingText.value = true
  try { const result = await $fetch<{ data: DropItem }>(`${API}/text`, { method: "POST", body: { content } }); persist(result.data); textContent.value = "" }
  catch { toast.add({ title: "发送失败，请稍后重试", color: "error" }) } finally { uploadingText.value = false }
}
async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const isText = /^(text\/|application\/(json|xml|javascript|yaml|toml|x-www-form-urlencoded))/.test(file.type) || /\.(txt|md|markdown|log|json|csv|ya?ml|xml|html|css|js|ts|py|rs|sh|toml|ini|conf|sql)$/i.test(file.name)
  const isMedia = /^(image|audio|video)\//.test(file.type) || /\.(jpg|jpeg|png|gif|webp|avif|heic|mp3|wav|ogg|m4a|aac|flac|opus|mp4|webm|mov|m4v|mkv|avi)$/i.test(file.name)
  if (!isText && !(loggedIn.value && isMedia)) { toast.add({ title: loggedIn.value ? "只支持文本、图片、音频或视频文件" : "免登录仅支持文本；登录后可上传图片、音频或视频", color: "error" }); input.value = ""; return }
  const maxSize = isMedia ? 100 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) { toast.add({ title: isMedia ? "图片、音频或视频不能超过 100 MB" : "文本文件不能超过 10 MB", color: "error" }); input.value = ""; return }
  uploadingFile.value = true
  try { const form = new FormData(); form.append("file", file); const result = await $fetch<{ data: DropItem }>(`${API}/file`, { method: "POST", body: form }); persist(result.data) }
  catch { toast.add({ title: "上传失败，请稍后重试", color: "error" }) } finally { uploadingFile.value = false; input.value = "" }
}
useHead({ title: "临时文件箱", meta: [{ name: "robots", content: "noindex,nofollow" }] })
</script>
