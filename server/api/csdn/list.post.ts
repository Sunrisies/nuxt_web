import { fetchCsdnArticleList } from "../../utils/csdn"
import { backendBase } from "../../utils/backend"

interface CsdnListItem {
  articleId: string
  title: string
  postTime: string
  viewCount: number
  exists: boolean
}

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const config = useRuntimeConfig(event)
  const body = await readBody<{ cookie?: string, page?: number }>(event)
  const cookie = body?.cookie || config.csdnCookie
  if (!cookie) throw createError({ statusCode: 400, message: "请提供 CSDN Cookie" })

  const page = body?.page || 1
  const csdnList = await fetchCsdnArticleList(cookie, page, 50)

  // 获取本地博客所有文章标题
  let localTitles = new Set<string>()
  try {
    const base = backendBase(event)
    const allPosts: { title: string }[] = []
    for (let p = 1; p <= 50; p++) {
      const res = await fetch(`${base}/v1/posts?page=${p}&limit=100`, {
        headers: { cookie: `access_token=${accessToken}` },
        signal: AbortSignal.timeout(10000)
      })
      const json = await res.json()
      const posts = json?.data?.data || []
      if (posts.length === 0) break
      allPosts.push(...posts)
      if (posts.length < 100) break
    }
    localTitles = new Set(allPosts.map(p => p.title))
  } catch { /* 本地文章获取失败时，所有文章标记为未同步 */ }

  const data: CsdnListItem[] = csdnList.map(item => ({
    ...item,
    exists: localTitles.has(item.title),
  }))

  return { code: 200, data }
})
