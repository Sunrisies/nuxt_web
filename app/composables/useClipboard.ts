import type { ClipboardEntry, ClipboardListResponse } from "~/types/clipboard"
import { http } from "~/composables/http"

// 频道 token 管理
const STORAGE_KEY = "clipboard_token"

export function getStoredToken(): string | null {
  if (import.meta.client) return localStorage.getItem(STORAGE_KEY)
  return null
}

export function setStoredToken(token: string) {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, token)
}

export function clearToken() {
  if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
}

/** 是否已登录频道 */
export function hasToken(): boolean {
  return !!getStoredToken()
}

// ─── 频道认证 ───────────────────────────────────────
export async function authChannel(name: string, password: string): Promise<string | null> {
  try {
    const res = await $fetch<any>("/api/v1/clipboard/channel/auth", {
      method: "POST",
      body: { name, password }
    })
    if (res.code === 200) {
      const token = res.data?.token || res.token
      if (token) return token
    }
    return null
  } catch {
    return null
  }
}

export async function createChannel(name: string, password: string): Promise<string | null> {
  try {
    const res = await $fetch<any>("/api/v1/clipboard/channel", {
      method: "POST",
      body: { name, password }
    })
    if (res.code === 200) return "created"
    return null
  } catch {
    return null
  }
}

// ─── API 调用（带 token） ───────────────────────────
function headers() {
  const t = getStoredToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function buildListUrl(page: number, limit: number, type: string, q: string, start: string, end: string): string {
  let url = `/api/v1/clipboard?page=${page}&limit=${limit}`
  if (type) url += `&type=${type}`
  if (q) url += `&q=${encodeURIComponent(q)}`
  if (start) url += `&start_date=${start}`
  if (end) url += `&end_date=${end}`
  return url
}

export async function fetchClipboardList(
  page: number, limit: number,
  type = "", q = "", start = "", end = ""
): Promise<ClipboardListResponse | null> {
  try {
    const res = await $fetch<any>(buildListUrl(page, limit, type, q, start, end), {
      headers: headers()
    })
    if (res.code === 200) return res.data
    if (res.code === 401) { clearToken(); return null }
    return null
  } catch {
    return null
  }
}

export async function uploadClipboardText(content: string): Promise<ClipboardEntry | null> {
  try {
    const res = await $fetch<any>("/api/v1/clipboard/text", {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    })
    if (res.code === 200) return res.data
    if (res.code === 401) clearToken()
    return null
  } catch {
    return null
  }
}

export async function uploadClipboardFile(file: File): Promise<ClipboardEntry | null> {
  try {
    const form = new FormData()
    form.append("file", file)
    const res = await $fetch<any>("/api/v1/clipboard/file", {
      method: "POST",
      headers: headers(),
      body: form
    })
    if (res.code === 200) return res.data
    if (res.code === 401) clearToken()
    return null
  } catch {
    return null
  }
}

export async function deleteClipboardEntry(uuid: string): Promise<boolean> {
  try {
    const res = await $fetch<any>(`/api/v1/clipboard/${uuid}`, {
      method: "DELETE",
      headers: headers()
    })
    if (res.code === 200) return true
    if (res.code === 401) clearToken()
    return false
  } catch {
    return false
  }
}

// ─── 工具函数 ───────────────────────────────────────
export function formatClipboardTime(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"))
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const pad = (n: number) => String(n).padStart(2, "0")
  if (isToday) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatClipboardSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function todayStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
