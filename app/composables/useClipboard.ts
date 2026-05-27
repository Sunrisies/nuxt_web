import type { ClipboardEntry, ClipboardListResponse } from "~/types/clipboard"
import { http } from "~/composables/http"

export function useClipboard() {
  const entries = ref<ClipboardEntry[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const hasMore = ref(true)
  const page = ref(1)
  const limit = 20

  // 当前筛选条件（给前端绑定用）
  const filterType = ref("")
  const searchQuery = ref("")
  const dateRange = ref({ start: "", end: "" })

  function buildUrl(): string {
    let url = `/v1/clipboard?page=${page.value}&limit=${limit}`
    if (filterType.value) url += `&type=${filterType.value}`
    if (searchQuery.value.trim()) url += `&q=${encodeURIComponent(searchQuery.value.trim())}`
    if (dateRange.value.start) url += `&start_date=${dateRange.value.start}`
    if (dateRange.value.end) url += `&end_date=${dateRange.value.end}`
    return url
  }

  async function fetchPage(): Promise<ClipboardListResponse | null> {
    try {
      return await http<ClipboardListResponse>({ url: buildUrl() })
    } catch {
      return null
    }
  }

  async function loadMore() {
    if (loading.value || !hasMore.value) return
    loading.value = true
    const res = await fetchPage()
    if (res) {
      entries.value = [...(res.data || []).reverse(), ...entries.value]
      const total = res.pagination?.total ?? 0
      hasMore.value = entries.value.length < total
      page.value++
    } else {
      hasMore.value = false
    }
    loading.value = false
  }

  /** 重置并重新加载（应用当前筛选条件） */
  async function refresh() {
    page.value = 1
    hasMore.value = true
    entries.value = []
    await loadMore()
  }

  /** 设置日期范围并刷新 */
  function setDateRange(start: string, end: string) {
    dateRange.value = { start, end }
  }

  /** 获取今天的 YYYY-MM-DD */
  function todayStr(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  /** 获取 N 天前的 YYYY-MM-DD */
  function daysAgoStr(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  async function uploadText(content: string): Promise<ClipboardEntry | null> {
    uploading.value = true
    try {
      const res = await http<ClipboardEntry>({
        url: "/v1/clipboard/text",
        method: "POST",
        body: { content }
      })
      if (res) entries.value.push(res)
      return res ?? null
    } catch (e: any) {
      console.error("上传文本失败", e)
      return null
    } finally {
      uploading.value = false
    }
  }

  async function uploadFile(file: File): Promise<ClipboardEntry | null> {
    uploading.value = true
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await http<ClipboardEntry>({
        url: "/v1/clipboard/file",
        method: "POST",
        body: form
      })
      if (res) entries.value.push(res)
      return res ?? null
    } catch (e: any) {
      console.error("上传文件失败", e)
      return null
    } finally {
      uploading.value = false
    }
  }

  async function remove(uuid: string) {
    try {
      await http({ url: `/v1/clipboard/${uuid}`, method: "DELETE" })
      entries.value = entries.value.filter((e) => e.uuid !== uuid)
    } catch (e: any) {
      console.error("删除失败", e)
    }
  }

  async function copyToClipboard(entry: ClipboardEntry): Promise<void> {
    const text = entry.type === "text" ? entry.content || "" : entry.file_url || ""
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.left = "-9999px"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr.replace(" ", "T"))
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const pad = (n: number) => String(n).padStart(2, "0")
    if (isToday) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return {
    entries, loading, uploading, hasMore,
    loadMore, refresh,
    filterType, searchQuery, dateRange,
    setDateRange, todayStr, daysAgoStr,
    uploadText, uploadFile, remove, copyToClipboard,
    formatTime, formatSize
  }
}
