import { createHash, randomUUID } from "node:crypto"
import type { H3Event } from "h3"
import type { IBlog, PostSummary, PostList, Tag } from "~~/app/types/blog"
import { backendBase, backendData } from "./backend"

const VERSION_KEY = "blog:version"
const observedRevisions = new Map<string, string>()

export async function authoritativeRevision(event: H3Event): Promise<string> {
  if (!event.context.publicContentRevision) {
    event.context.publicContentRevision = backendData<string>(event, "/v1/posts/content-version").then(async revision => {
      if (typeof revision !== "string" || !/^[a-f0-9-]{36}:\d+$/.test(revision)) {
        throw createError({ statusCode: 502, statusMessage: "Invalid content revision" })
      }
      const backend = backendBase(event)
      const previous = observedRevisions.get(backend)
      if (previous && previous !== revision) await invalidatePublicContent()
      observedRevisions.set(backend, revision)
      return revision
    })
  }
  // A failed authority read must fail closed instead of serving possibly unpublished content.
  return event.context.publicContentRevision as Promise<string>
}

export async function invalidatePublicContent() {
  const storage = useStorage("cache")
  await storage.setItem(VERSION_KEY, randomUUID())
  const keys = await storage.getKeys("blog")
  await Promise.all(keys.filter(key => key !== VERSION_KEY).map(key => storage.removeItem(key)))
}

async function cacheKey(event: H3Event, ...parts: unknown[]) {
  const revision = await authoritativeRevision(event)
  const version = await useStorage("cache").getItem<string>(VERSION_KEY) || "0"
  return createHash("sha256").update(JSON.stringify([backendBase(event), revision, version, ...parts])).digest("hex")
}

export function postSummary(post: IBlog): PostSummary {
  if (post.is_hide || post.is_publish === false) throw createError({ statusCode: 502, statusMessage: "Upstream returned unpublished content" })
  const { content: _content, ...summary } = post
  return summary
}

export function normalizeList<T>(value: T[] | { data: T[], pagination?: Partial<PostList["pagination"]> }, limit: number, page: number) {
  const data = Array.isArray(value) ? value : value?.data
  if (!Array.isArray(data)) throw createError({ statusCode: 502, statusMessage: "Invalid list response" })
  const pagination = Array.isArray(value) ? undefined : value.pagination
  return { data, pagination: { total: pagination?.total ?? data.length, limit: pagination?.limit || limit, page: pagination?.page || page } }
}

export const publicPosts = defineCachedFunction(async (event: H3Event, query: Record<string, string | number>): Promise<PostList> => {
  const limit = Number(query.limit) || 12
  const page = Number(query.page) || 1
  const result = normalizeList(await backendData<IBlog[] | PostList>(event, "/v1/posts", query), limit, page)
  return { ...result, data: result.data.map(post => postSummary(post as IBlog)) }
}, { name: "public-posts", group: "blog", maxAge: 60, staleMaxAge: 300, swr: true, getKey: cacheKey })

export const publicTags = defineCachedFunction(async (event: H3Event): Promise<Tag[]> => {
  const data = await backendData<Tag[] | { data: Tag[] }>(event, "/v1/tags/count")
  return normalizeList(data, 100, 1).data
}, { name: "tags-counts", group: "blog", maxAge: 60, staleMaxAge: 300, swr: true, getKey: cacheKey })

export const publicCategories = defineCachedFunction(async (event: H3Event) => {
  const items: { id: number, name: string }[] = []
  const seen = new Set<number>()
  for (let page = 1; page <= 100; page++) {
    const data = await backendData<{ id: number, name: string }[] | { data: { id: number, name: string }[], pagination?: Partial<PostList["pagination"]> }>(event, "/v1/categories", { page, limit: 100 })
    const result = normalizeList(data, 100, page)
    for (const item of result.data) {
      if (seen.has(item.id)) throw createError({ statusCode: 502, statusMessage: "Inconsistent category pagination" })
      seen.add(item.id)
      items.push(item)
    }
    if (items.length >= result.pagination.total) return items
    if (!result.data.length) break
  }
  throw createError({ statusCode: 502, statusMessage: "Incomplete category response" })
}, { name: "categories", group: "blog", maxAge: 60, staleMaxAge: 300, swr: true, getKey: cacheKey })

export const publicArchive = defineCachedFunction(async (event: H3Event): Promise<PostList> => {
  const posts: PostSummary[] = []
  let total = 0
  for (let page = 1; page <= 100; page++) {
    const result = normalizeList(await backendData<IBlog[] | PostList>(event, "/v1/posts", { page, limit: 100 }), 100, page)
    total = result.pagination.total
    posts.push(...result.data.map(post => postSummary(post as IBlog)))
    if (posts.length >= total) return { data: posts, pagination: { total, limit: posts.length, page: 1 } }
    if (!result.data.length) break
  }
  throw createError({ statusCode: 502, statusMessage: "Incomplete archive response" })
}, { name: "archive", group: "blog", maxAge: 60, staleMaxAge: 300, swr: true, getKey: cacheKey })

export const publicWarehouse = defineCachedFunction((event: H3Event) => backendData<[string, number][]>(event, "/v1/posts/uploadTime"), {
  name: "warehouse", group: "blog", maxAge: 60, staleMaxAge: 300, swr: true, getKey: cacheKey
})

async function archivedNeighbors(event: H3Event, slug: string) {
  const empty = { prev: null, next: null }
  return new Promise<{ prev: { uuid: string, title: string } | null, next: { uuid: string, title: string } | null }>(resolve => {
    const timer = setTimeout(() => resolve(empty), 1500)
    // 仅专用接口缺失时使用共享摘要缓存，不再为每篇文章查询 200 条列表。
    void publicArchive(event).then(archive => {
      const index = archive.data.findIndex(post => post.uuid === slug)
      const neighbor = (position: number) => {
        const post = archive.data[position]
        return post ? { uuid: post.uuid, title: post.title } : null
      }
      resolve(index < 0 ? empty : { prev: neighbor(index - 1), next: neighbor(index + 1) })
    }, () => resolve(empty)).finally(() => clearTimeout(timer))
  })
}

interface ArticleNeighbors {
  prev?: { uuid: string, title: string } | null
  next?: { uuid: string, title: string } | null
  prevArticle?: { uuid: string, title: string } | null
  nextArticle?: { uuid: string, title: string } | null
}

export const publicArticle = defineCachedFunction(async (event: H3Event, slug: string) => {
  const [article, neighbors] = await Promise.all([
    backendData<IBlog>(event, `/v1/posts/${encodeURIComponent(slug)}`),
    backendData<ArticleNeighbors>(event, `/v1/posts/${encodeURIComponent(slug)}/prevnext`, undefined, 1500)
      .catch((error: { statusCode?: number }) => error.statusCode === 404
        ? archivedNeighbors(event, slug)
        : { prev: null, next: null })
  ])
  if (!article?.uuid || !article.title || typeof article.content !== "string") {
    throw createError({ statusCode: 502, statusMessage: "Invalid article response" })
  }
  // 按缓存版本复用服务端 AST；浏览器不下载解析器或完整 Markdown。
  const { parseMarkdown } = await import("@nuxtjs/mdc/runtime")
  const started = performance.now()
  const ast = await parseMarkdown(article.content, { highlight: false })
  if (!event.handled && !event.node.res.headersSent) appendResponseHeader(event, "Server-Timing", `markdown;dur=${(performance.now() - started).toFixed(1)}`)
  const readingMinutes = Math.max(1, Math.ceil(article.content.replace(/\s/g, "").length / 400))
  const adjacent: ArticleNeighbors | null = neighbors
  return { article: postSummary(article), ast, neighbors: { prev: adjacent?.prev || adjacent?.prevArticle || null, next: adjacent?.next || adjacent?.nextArticle || null }, readingMinutes }
}, { name: "article", group: "blog", maxAge: 300, staleMaxAge: 600, swr: true, getKey: cacheKey })
