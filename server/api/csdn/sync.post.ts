import type { H3Event } from "h3"
import { backendBase } from "../../utils/backend"
import { fetchCsdnArticleDetail } from "../../utils/csdn"

interface SyncDetail {
  title: string
  status: "created" | "skipped" | "failed"
  message?: string
}

interface SyncResult {
  total: number
  created: number
  skipped: number
  failed: number
  details: SyncDetail[]
}

// ==================== 图片处理 ====================

function extractImageUrls(text: string): string[] {
  if (!text) return []
  const reg = /https?:\/\/[\w.-]*csdnimg\.cn\/[^\s"')]+?\.(?:jpe?g|png|webp|gif)/gi
  return [...new Set(text.match(reg) ?? [])]
}

async function downloadImage(url: string): Promise<{ buffer: Buffer, contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://blog.csdn.net/" },
      signal: AbortSignal.timeout(30000)
    })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get("content-type") || "image/jpeg"
    return { buffer, contentType }
  } catch { return null }
}

async function uploadImage(event: H3Event, buffer: Buffer, filename: string, contentType: string, accessToken: string): Promise<string | null> {
  try {
    const form = new FormData()
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType })
    form.append("file", blob, `${filename}.${ext}`)
    const base = backendBase(event)
    const res = await fetch(`${base}/v1/images/upload`, {
      method: "POST",
      headers: { cookie: `access_token=${accessToken}` },
      body: form,
      signal: AbortSignal.timeout(60000)
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data?.url || null
  } catch { return null }
}

async function replaceImages(event: H3Event, content: string, markdown: string, accessToken: string): Promise<{ content: string, markdown: string, failedCount: number }> {
  const urls = [...new Set([...extractImageUrls(content), ...extractImageUrls(markdown)])]
  let failedCount = 0
  let outContent = content
  let outMarkdown = markdown

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!
    const downloaded = await downloadImage(url)
    if (!downloaded) { failedCount++; continue }
    const newUrl = await uploadImage(event, downloaded.buffer, `csdn-img-${Date.now()}-${i}`, downloaded.contentType, accessToken)
    if (!newUrl) { failedCount++; continue }
    outContent = outContent.split(url).join(newUrl)
    outMarkdown = outMarkdown.split(url).join(newUrl)
  }

  return { content: outContent, markdown: outMarkdown, failedCount }
}

// ==================== 后端 API 调用 ====================

// CSDN 列表返回的是北京时间（YYYY-MM-DD HH:mm:ss），显式按 +08:00 解析后转成 UTC，
// 避免服务器时区不同导致发布时间偏移。
function toPublishTime(raw: string): string | undefined {
  if (!raw) return undefined
  const s = raw.trim()
  const matched = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/)
  const date = matched ? new Date(`${matched[1]}T${matched[2]}+08:00`) : new Date(s)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

async function checkPostExists(event: H3Event, title: string, accessToken: string): Promise<boolean> {
  try {
    const base = backendBase(event)
    const res = await fetch(`${base}/v1/posts?search=${encodeURIComponent(title)}&page=1&limit=5`, {
      headers: { cookie: `access_token=${accessToken}` },
      signal: AbortSignal.timeout(10000)
    })
    const json = await res.json()
    const data = json?.data
    const posts = Array.isArray(data) ? data : data?.data || []
    return posts.some((p: { title: string }) => p.title === title)
  } catch { return false }
}

async function findOrCreateCategory(event: H3Event, name: string, accessToken: string): Promise<number | null> {
  const base = backendBase(event)
  try {
    const res = await fetch(`${base}/v1/categories?page=1&limit=100`, {
      headers: { cookie: `access_token=${accessToken}` },
      signal: AbortSignal.timeout(10000)
    })
    const json = await res.json()
    const existing = json?.data?.find?.((c: { name: string, id: number }) => c.name === name)
    if (existing) return existing.id

    const createRes = await fetch(`${base}/v1/categories`, {
      method: "POST",
      headers: { cookie: `access_token=${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(10000)
    })
    const createJson = await createRes.json()
    return createJson?.data?.id || null
  } catch { return null }
}

async function findOrCreateTag(event: H3Event, name: string, accessToken: string): Promise<number | null> {
  const base = backendBase(event)
  try {
    const res = await fetch(`${base}/v1/tags?page=1&limit=100`, {
      headers: { cookie: `access_token=${accessToken}` },
      signal: AbortSignal.timeout(10000)
    })
    const json = await res.json()
    const existing = json?.data?.find?.((t: { name: string, id: number }) => t.name === name)
    if (existing) return existing.id

    const createRes = await fetch(`${base}/v1/tags`, {
      method: "POST",
      headers: { cookie: `access_token=${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(10000)
    })
    const createJson = await createRes.json()
    return createJson?.data?.id || null
  } catch { return null }
}

async function createPost(event: H3Event, params: {
  title: string
  markdowncontent: string
  content: string
  description: string
  cover_image: string
  category_id: number | null
  tag_ids: number[]
  publishTime: string
  accessToken: string
}): Promise<boolean> {
  try {
    const base = backendBase(event)
    const res = await fetch(`${base}/v1/posts`, {
      method: "POST",
      headers: { cookie: `access_token=${params.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: params.title,
        summary: params.description,
        content: params.content,
        markdowncontent: params.markdowncontent,
        cover_image: params.cover_image,
        category_id: params.category_id,
        tag_ids: params.tag_ids,
        status: 0,
        featured: false,
        publish_time: toPublishTime(params.publishTime),
      }),
      signal: AbortSignal.timeout(30000)
    })
    if (!res.ok) {
      console.log("[CSDN Sync] createPost failed:", res.status, await res.text().catch(() => ""))
      return false
    }
    const json = await res.json()
    console.log("[CSDN Sync] createPost response:", JSON.stringify(json).substring(0, 200))
    return json?.code === 200
  } catch { return false }
}

// ==================== 主接口 ====================

export default defineEventHandler(async (event): Promise<SyncResult> => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const config = useRuntimeConfig(event)
  const body = await readBody<{ cookie?: string, articles?: { id: string, postTime: string }[] }>(event)
  const cookie = body?.cookie || config.csdnCookie
  if (!cookie) throw createError({ statusCode: 400, message: "请提供 CSDN Cookie" })
  if (!body?.articles || !Array.isArray(body.articles) || body.articles.length === 0) {
    throw createError({ statusCode: 400, message: "请选择要同步的文章" })
  }

  const details: SyncDetail[] = []
  let created = 0, skipped = 0, failed = 0

  for (const article of body.articles) {
    try {
      const detail = await fetchCsdnArticleDetail(cookie, article.id)
      if (!detail || !detail.article_id || !detail.title) {
        failed++
        details.push({ title: `文章 ${article.id}`, status: "failed", message: "文章详情获取失败" })
        continue
      }

      const exists = await checkPostExists(event, detail.title, accessToken)
      if (exists) {
        skipped++
        details.push({ title: detail.title, status: "skipped", message: "文章已存在" })
        continue
      }

      const { content, markdown, failedCount: imgFailed } = await replaceImages(
        event,
        detail.content || "",
        detail.markdowncontent || "",
        accessToken
      )

      const categoryId = await findOrCreateCategory(event, detail.categories || "默认", accessToken)
      if (!categoryId) {
        failed++
        details.push({ title: detail.title, status: "failed", message: "创建分类失败" })
        continue
      }

      const tagIds: number[] = []
      if (detail.tags) {
        const tagNames: string[] = detail.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        for (const tagName of tagNames.slice(0, 5)) {
          const tagId = await findOrCreateTag(event, tagName, accessToken)
          if (tagId) tagIds.push(tagId)
        }
      }

      const success = await createPost(event, {
        title: detail.title,
        markdowncontent: markdown,
        content,
        description: detail.description || "",
        cover_image: "",
        category_id: categoryId,
        tag_ids: tagIds,
        publishTime: article.postTime,
        accessToken
      })

      if (success) {
        created++
        details.push({
          title: detail.title,
          status: "created",
          message: imgFailed > 0 ? `成功，${imgFailed} 张图片转存失败` : "成功"
        })
      } else {
        failed++
        details.push({ title: detail.title, status: "failed", message: "保存文章失败" })
      }
    } catch (error) {
      failed++
      const msg = error instanceof Error ? error.message : "未知错误"
      details.push({ title: `文章 ${article.id}`, status: "failed", message: msg })
    }
  }

  return { total: body.articles.length, created, skipped, failed, details }
})
