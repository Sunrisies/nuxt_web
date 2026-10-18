<template>
  <div class="flex h-full min-h-0 w-full min-w-0 flex-col bg-default">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-3 sm:px-4">
      <UInput v-model="postForm.title" aria-label="文章标题" placeholder="请输入文章标题" :maxlength="255" :disabled="saving || !ready" class="w-full min-w-0 md:w-auto md:flex-1" :ui="{ base: 'border-0 ring-0 focus-visible:ring-1 text-lg font-medium' }" />
      <UButton to="/admin/posts" variant="ghost" aria-label="返回文章列表" icon="i-heroicons-arrow-left" />
      <UButton v-if="editingPost" variant="ghost" :loading="loadingVersions" @click="openVersions">版本历史</UButton>
      <UButton variant="outline" :disabled="!ready" @click="showSettings = true">文章设置</UButton>
          <UButton v-if="!editingPost" variant="outline" :loading="saving" :disabled="!!uploading || !!creatingOption" @click="savePost(0)">保存草稿</UButton>
          <UButton v-if="editingPost" color="primary" :loading="saving" :disabled="!!uploading || !!creatingOption" @click="savePost()">保存</UButton>
          <UButton v-if="!editingPost || postForm.status !== 1" color="primary" :loading="saving" :disabled="!!uploading || !!creatingOption" @click="savePost(1)">发布文章</UButton>

    </header>
    <div class="flex shrink-0 items-center gap-3 border-b px-3 py-2 text-xs text-muted sm:px-4">
      <input ref="bodyImageInput" type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传正文图片文件" class="hidden" @change="uploadImage($event, 'body')">
      <UButton variant="ghost" size="sm" icon="i-heroicons-photo" :loading="uploading === 'body'" :disabled="!!uploading || saving || !ready" @click="rememberCursor(); bodyImageInput?.click()">插入图片</UButton>
      <span class="hidden sm:inline">Markdown · 实时预览</span>
      <div class="ml-auto flex gap-2 md:hidden" aria-label="编辑视图">
        <UButton size="sm" :variant="mobilePane === 'write' ? 'solid' : 'ghost'" @click="mobilePane = 'write'">编写内容</UButton>
        <UButton size="sm" :variant="mobilePane === 'preview' ? 'solid' : 'ghost'" @click="mobilePane = 'preview'">预览正文</UButton>
      </div>
      <UButton v-if="lastSaved?.published" :to="`/article/${lastSaved.uuid}`" target="_blank" size="sm" variant="ghost" class="ml-auto">查看文章</UButton>
    </div>
    <div v-if="storageError || recovery || saveError || loadError" class="max-h-[35dvh] shrink-0 overflow-auto p-2 space-y-2">
      <UAlert v-if="storageError" color="warning" :title="storageError" />
      <UAlert v-if="recovery" title="发现此文章的本地未保存草稿"><template #actions><UButton @click="restoreDraft">恢复草稿</UButton><UButton variant="outline" @click="discardRecovery">放弃本地草稿</UButton></template></UAlert>
      <UAlert v-if="saveError" color="error" :title="saveError" />
      <UAlert v-if="loadError" color="error" :title="loadError"><template #actions><UButton @click="reloadNuxtApp()">重新加载</UButton></template></UAlert>
    </div>
    <p v-if="!ready && !loadError" class="p-4">正在加载编辑器…</p>
    <div v-else-if="ready" class="grid min-h-0 min-w-0 flex-1 md:grid-cols-2 overflow-hidden" data-testid="writing-workbench">
      <section :class="mobilePane === 'preview' ? 'hidden md:flex' : 'flex'" class="min-h-0 min-w-0 flex-col md:border-r" aria-label="Markdown 编辑区">
        <div class="shrink-0 border-b bg-muted/30 px-4 py-2 text-xs text-muted">Markdown 内容</div>
        <textarea ref="nativeMarkdownInput" v-model="postForm.markdowncontent" aria-label="文章正文" :disabled="saving" class="min-h-0 w-full flex-1 resize-none overflow-auto bg-transparent p-4 font-mono text-sm leading-7 outline-offset-[-2px]" placeholder="在这里开始写作，右侧会实时显示排版效果…" />
      </section>
      <section :class="mobilePane === 'write' ? 'hidden md:flex' : 'flex'" class="min-h-0 min-w-0 flex-col" aria-label="正文预览">
        <div class="shrink-0 border-b bg-muted/30 px-4 py-2 text-xs text-muted">实时排版预览</div>
        <div class="min-h-0 flex-1 overflow-auto p-5 sm:p-6" data-testid="preview-scroll">
          <MDC v-if="postForm.markdowncontent" :value="postForm.markdowncontent" class="prose max-w-none break-words dark:prose-invert [&_pre]:overflow-x-auto [&_img]:max-w-full" />
          <p v-else class="text-sm text-muted">开始输入 Markdown，排版结果将实时显示在这里。</p>
        </div>
      </section>
    </div>
    <footer class="flex shrink-0 items-center justify-between border-t px-4 py-2 text-xs text-muted"><span>{{ dirty ? '未保存 · 本地草稿已保留' : lastSaved ? '已保存到后端' : '草稿' }}</span><span>{{ postForm.markdowncontent.length }} 字符</span></footer>
    <UModal v-model:open="showSettings" title="文章设置" description="设置文章分类、标签、发布状态和封面。关闭弹窗后继续写作。" :dismissible="!saving && !uploading && !creatingOption" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <fieldset :disabled="saving" class="space-y-5 min-w-0">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="分类" required>
              <USelect
                v-model="postForm.category_id"
                :items="categoryOptions"
                aria-label="文章分类"
                placeholder="选择分类"
                class="w-full"
              />
              <div class="mt-2 flex gap-2">
                <UInput v-model="newCategory" aria-label="新分类名称" placeholder="新分类名称" class="min-w-0 flex-1" @keydown.enter.prevent="createOption('categories')" />
                <UButton variant="outline" :loading="creatingOption === 'categories'" :disabled="!newCategory.trim() || !!creatingOption" @click="createOption('categories')">新建分类</UButton>
              </div>
            </UFormField>

            <UFormField label="标签" required>
              <USelect
                v-model="postForm.tag_ids"
                :items="tagOptions"
                aria-label="文章标签"
                placeholder="至少选择一个标签"
                multiple
                class="w-full"
              />
              <div class="mt-2 flex gap-2">
                <UInput v-model="newTag" aria-label="新标签名称" placeholder="新标签名称" class="min-w-0 flex-1" @keydown.enter.prevent="createOption('tags')" />
                <UButton variant="outline" :loading="creatingOption === 'tags'" :disabled="!newTag.trim() || !!creatingOption" @click="createOption('tags')">新建标签</UButton>
              </div>
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="状态">
              <USelect
                v-model="postForm.status"
                aria-label="文章状态"
                :items="statusOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="文章封面" hint="不上传时按分类自动生成">
              <input ref="coverImageInput" type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传封面文件" class="hidden" @change="uploadImage($event, 'cover')">
              <UButton class="mt-2" variant="outline" :loading="uploading === 'cover'" :disabled="!!uploading || saving" @click="coverImageInput?.click()">上传封面</UButton>
              <UButton v-if="postForm.cover_image" class="ml-2" variant="ghost" :disabled="saving || !!uploading" @click="postForm.cover_image = ''">使用分类默认封面</UButton>
              <NuxtImg v-if="postForm.cover_image || postForm.category_id" :src="postForm.cover_image || `/api/v1/posts/category-cover/${postForm.category_id}.svg`" alt="封面预览" class="mt-3 w-full rounded aspect-[1200/630] object-cover" />
              <p class="mt-2 text-xs text-muted">{{ postForm.cover_image ? '使用已上传的自定义封面' : postForm.category_id ? '后端自动生成，展示所选分类名称；修改分类后会自动更新。' : '选择分类后可预览默认封面。' }}</p>
            </UFormField>
          </div>

          <div class="flex items-center gap-6">
            <UFormField label="推荐并置顶">
              <USwitch v-model="postForm.featured" />
            </UFormField>
          </div>

          <UFormField label="摘要">
            <UTextarea v-model="postForm.summary" aria-label="文章摘要" :maxlength="500" class="w-full" :rows="3" />
          </UFormField>

          <details>
            <summary class="cursor-pointer text-sm text-muted">高级内容（可选，保留已有 HTML）</summary>
          <UFormField label="渲染内容（HTML）">
            <UTextarea
              v-model="postForm.content"
              class="w-full font-mono"
              :rows="10"
            />
          </UFormField>
          </details>
        </fieldset>
      </template>
      <template #footer><div class="flex w-full justify-end"><UButton :disabled="saving || !!uploading || !!creatingOption" @click="showSettings = false">完成设置</UButton></div></template>
    </UModal>
    <UModal v-model:open="showVersions" title="文章版本历史" description="恢复会将该版本内容写回编辑器；保存后会自动保留当前版本。">
      <template #body>
        <div v-if="!versions.length" class="py-6 text-center text-sm text-muted">暂时没有历史版本</div>
        <div v-else class="space-y-3">
          <div v-for="version in versions" :key="version.id" class="rounded-lg border p-3">
            <div class="flex items-start gap-3"><div class="min-w-0 flex-1"><p class="truncate font-medium">{{ version.title }}</p><p class="mt-1 text-xs text-muted">{{ formatDateForDisplay(version.created_at) }} · {{ version.markdowncontent.length }} 字符</p></div><UButton size="xs" variant="outline" @click="restoreVersion(version)">恢复到编辑器</UButton></div>
          </div>
        </div>
      </template>
    </UModal>

  </div>
</template>

<script setup lang="ts">
import type { AdminPost, AdminNamedItem } from "~/types/admin"
import { http } from "~/composables/http"
import { articleDraftError, insertArticleImage, isArticleImageUrl } from "~/utils/article-editor"
const props = defineProps<{ uuid?: string }>()
const router = useRouter()
const toast = useToast()
const editingLoading = ref(false)
const loadError = ref("")
const { user } = useAdminSession()
const baseline = ref("")
const ready = ref(false)
const recovery = ref<string | null>(null)
const storageError = ref("")
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

const editingPost = ref<AdminPost | null>(null)
const saveError = ref("")
const lastSaved = ref<{ uuid: string, published: boolean, status: number } | null>(null)
const showSettings = ref(false)
const showVersions = ref(false)
const loadingVersions = ref(false)
type PostVersion = { id: number, title: string, summary: string | null, content: string, markdowncontent: string, cover_image: string | null, category_id: number, tag_ids: number[], status: number, featured: boolean, created_at: string }
const versions = ref<PostVersion[]>([])
const mobilePane = ref<"write" | "preview">("write")
const newCategory = ref("")
const newTag = ref("")
const creatingOption = ref<"categories" | "tags" | null>(null)
const uploading = ref<"cover" | "body" | null>(null)
const coverImageInput = ref<HTMLInputElement>()
const bodyImageInput = ref<HTMLInputElement>()
const nativeMarkdownInput = ref<HTMLTextAreaElement>()
let cursor = { start: 0, end: 0 }
let formSession = 0
let uploadController: AbortController | undefined
let internalNavigation = false
const saving = ref(false)

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

}
const postForm = reactive({ ...defaultForm })

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

async function openEdit(summary: Pick<AdminPost, "uuid">) {
  if (editingLoading.value) return
  editingLoading.value = true
  try {
    const post = await http<AdminPost>({ url: `/v1/posts/${encodeURIComponent(summary.uuid)}` })

  resetEditor()
  editingPost.value = post
  postForm.title = post.title || ""
  postForm.summary = post.summary || post.description || ""
  postForm.content = post.htmlcontent || ""
  postForm.markdowncontent = post.markdowncontent || post.content || ""
  postForm.cover_image = /^\/api\/v1\/posts\/category-cover\//.test(post.cover || post.cover_image || "") ? "" : post.cover || post.cover_image || ""
  postForm.category_id = post.category?.id ?? null
  postForm.tag_ids = post.tags?.map((t: { id: number }) => t.id) || []
  postForm.status = post.is_hide ? 2 : post.is_publish ? 1 : 0
  postForm.featured = post.featured ?? post.is_recommend ?? post.is_top ?? false
  baseline.value = JSON.stringify(postForm)
  offerRecovery()
  } catch {
    loadError.value = "文章详情加载失败，请重试"
    toast.add({ title: "文章详情加载失败，请重试", color: "error" })
  } finally {
    editingLoading.value = false
  }
}

function resetEditor() {
  formSession++
  uploadController?.abort()
  uploading.value = null
  saveError.value = ""
}
async function savePost(status?: number) {
  if (saving.value || uploading.value || creatingOption.value) return
  saveError.value = articleDraftError(postForm)
  if (saveError.value) {
    if (!postForm.category_id || !postForm.tag_ids.length) showSettings.value = true
    toast.add({ title: saveError.value, color: "error" })
    return
  }
  saving.value = true
  try {
    const body: Record<string, unknown> = {
      title: postForm.title.trim(),
      summary: postForm.summary,
      ...(!editingPost.value || editingPost.value.htmlcontent !== undefined || postForm.content
        ? { content: postForm.content } : {}),
      markdowncontent: postForm.markdowncontent,
      cover_image: postForm.cover_image,
      category_id: postForm.category_id,
      tag_ids: postForm.tag_ids,
      status: status ?? postForm.status,
      featured: postForm.featured
    }

    let saved: Pick<AdminPost, "uuid">
    if (editingPost.value) {
      saved = await http<AdminPost>({
        url: `/v1/posts/${editingPost.value.uuid}`,
        method: "PUT",
        body
      })
    } else {
      saved = await http<AdminPost>({ url: "/v1/posts", method: "POST", body })
    }
    const uuid = saved?.uuid || editingPost.value?.uuid
    if (uuid) lastSaved.value = { uuid, published: body.status === 1, status: Number(body.status) }
    toast.add({ title: body.status === 1 ? "文章已发布" : body.status === 2 ? "文章已下线" : "草稿已保存", color: "success" })
    postForm.status = Number(body.status)
    baseline.value = JSON.stringify(postForm)
    try { localStorage.removeItem(draftKey.value) } catch { /* Browser storage unavailable. */ }
    if (uuid && !editingPost.value) {
      internalNavigation = true
      await router.replace(`/admin/posts/${uuid}/edit`)
      internalNavigation = false
    }
  } catch (e) {
    saveError.value = requestErrorMessage(e, "保存失败，请重试。你的正文仍保留在编辑器中。")
    if (!postForm.category_id || !postForm.tag_ids.length) showSettings.value = true
    toast.add({ title: saveError.value, color: "error" })
  } finally {
    saving.value = false
  }
}

async function openVersions() {
  if (!editingPost.value) return
  loadingVersions.value = true
  try {
    versions.value = await http<PostVersion[]>({ url: `/v1/posts/${encodeURIComponent(editingPost.value.uuid)}/versions` })
    showVersions.value = true
  } catch (error) { toast.add({ title: requestErrorMessage(error, "版本历史加载失败"), color: "error" }) }
  finally { loadingVersions.value = false }
}

function restoreVersion(version: PostVersion) {
  Object.assign(postForm, { title: version.title, summary: version.summary || "", content: version.content || "", markdowncontent: version.markdowncontent, cover_image: version.cover_image || "", category_id: version.category_id, tag_ids: version.tag_ids, status: version.status, featured: version.featured })
  showVersions.value = false
  toast.add({ title: "历史版本已恢复到编辑器，请确认后保存", color: "success" })
}

async function createOption(kind: "categories" | "tags") {
  if (creatingOption.value) return
  const input = kind === "categories" ? newCategory : newTag
  const name = input.value.trim()
  if (!name) return
  const session = formSession
  creatingOption.value = kind
  try {
    const list = kind === "categories" ? categories : tags
    const item = list.value.find(item => item.name === name)
      || await http<AdminNamedItem>({ url: `/v1/${kind}`, method: "POST", body: { name } })
    if (!Number.isInteger(item.id)) throw new Error("选项创建失败")
    if (!list.value.some(value => value.id === item.id)) list.value.push(item)
    if (session !== formSession) return
    if (kind === "categories") postForm.category_id = item.id
    else postForm.tag_ids = [...new Set([...postForm.tag_ids, item.id])]
    input.value = ""
    toast.add({ title: kind === "categories" ? "分类已选择" : "标签已选择", color: "success" })
  } catch (error) {
    toast.add({ title: requestErrorMessage(error, "创建失败，请重试"), color: "error" })
  } finally {
    creatingOption.value = null
  }
}

function rememberCursor() {
  const input = nativeMarkdownInput.value
  cursor = { start: input?.selectionStart ?? postForm.markdowncontent.length, end: input?.selectionEnd ?? postForm.markdowncontent.length }
}

async function uploadImage(event: Event, target: "cover" | "body") {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file || uploading.value) return
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) {
    toast.add({ title: "请选择不超过 10MB 的 PNG、JPG 或 WebP 图片", color: "error" })
    return
  }
  const session = formSession
  const selection = { ...cursor }
  uploading.value = target
  uploadController = new AbortController()
  try {
    const body = new FormData()
    body.append("file", file)
    const image = await http<{ url: string }>({ url: "/v1/images/upload", method: "POST", body, timeout: 60000, signal: uploadController.signal })
    if (!isArticleImageUrl(image.url)) throw new Error("服务器返回的图片地址无效")
    if (session !== formSession) return
    if (target === "cover") postForm.cover_image = image.url
    else {
      const inserted = insertArticleImage(postForm.markdowncontent, selection.start, selection.end, image.url, file.name)
      postForm.markdowncontent = inserted.value
      await nextTick()
      nativeMarkdownInput.value?.focus()
      nativeMarkdownInput.value?.setSelectionRange(inserted.cursor, inserted.cursor)
    }
    toast.add({ title: target === "cover" ? "封面已上传" : "图片已插入正文", color: "success" })
  } catch (error) {
    if (session === formSession) toast.add({ title: requestErrorMessage(error, "图片上传失败，请重试"), color: "error" })
  } finally {
    if (session === formSession) uploading.value = null
  }
}


const dirty = computed(() => ready.value && JSON.stringify(postForm) !== baseline.value)
const draftKey = computed(() => `article-editor:v1:${user.value?.uuid}:${props.uuid || 'new'}`)
function offerRecovery() {
  try {
    const draft = localStorage.getItem(draftKey.value)
    if (draft && draft !== baseline.value) recovery.value = draft
  } catch { storageError.value = "浏览器无法保存本地草稿，请及时保存到后端。" }
}
function restoreDraft() {
  try {
    const draft = JSON.parse(recovery.value || "null")
    if (!draft || typeof draft !== "object") throw new Error("Invalid draft")
    for (const key of Object.keys(defaultForm) as (keyof typeof defaultForm)[]) {
      if (key !== "category_id" && typeof draft[key] !== typeof defaultForm[key]) throw new Error("Invalid draft")
    }
    if ((draft.category_id !== null && !Number.isInteger(draft.category_id)) || !Array.isArray(draft.tag_ids) || !draft.tag_ids.every(Number.isInteger)) throw new Error("Invalid tags")
    Object.assign(postForm, draft)
  } catch { storageError.value = "本地草稿无法恢复，请重新编辑。" }
  recovery.value = null
}
function discardRecovery() {
  try { localStorage.removeItem(draftKey.value) } catch { /* Browser storage unavailable. */ }
  recovery.value = null
}
watch(postForm, () => {
  if (!ready.value || !dirty.value || recovery.value) return
  try { localStorage.setItem(draftKey.value, JSON.stringify(postForm)) }
  catch { storageError.value = "浏览器无法保存本地草稿，请及时保存到后端。" }
}, { deep: true, flush: "sync" })
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value || saving.value || uploading.value) { event.preventDefault(); event.returnValue = "" }
}
onBeforeRouteLeave(() => {
  if (internalNavigation) return true
  if (saving.value || uploading.value || creatingOption.value) {
    toast.add({ title: "请等待保存或上传完成后再离开", color: "warning" }); return false
  }
  return !dirty.value || window.confirm("文章尚未保存到后端，确定离开吗？本地草稿会保留在此浏览器。")
})
onMounted(async () => {
  window.addEventListener("beforeunload", beforeUnload)
  await Promise.all([fetchCategories(), fetchTags()])
  if (props.uuid) await openEdit({ uuid: props.uuid })
  else { baseline.value = JSON.stringify(postForm); offerRecovery() }
  ready.value = !loadError.value
})
onBeforeUnmount(() => {
  formSession++
  uploadController?.abort()
  window.removeEventListener("beforeunload", beforeUnload)
})

</script>
