import type { H3Event } from "h3"
import { backendBase } from "./backend"

export interface SeoPost {
  id: number
  uuid: string
  title: string
  description: string
  summary: string
  content: string
  markdowncontent: string
  category: { name: string } | null
  tags: { name: string }[]
}

/**
 * 通过后端接口按数字 ID 读取文章（列表接口拿到 uuid，再取详情）。
 * analyze / preview / rewrite 三个 SEO 接口共用。
 */
export async function fetchSeoPost(
  event: H3Event,
  accessToken: string,
  postId: number
): Promise<SeoPost> {
  const base = backendBase(event)
  const listRes = await fetch(`${base}/v1/posts?page=1&limit=100`, {
    headers: { cookie: `access_token=${accessToken}` },
    signal: AbortSignal.timeout(10000)
  })
  const listJson = await listRes.json()
  const posts = listJson?.data?.data || []
  const summary = posts.find((p: any) => p.id === postId)

  if (!summary) throw createError({ statusCode: 404, message: "文章不存在" })

  const postRes = await fetch(`${base}/v1/posts/${summary.uuid}`, {
    headers: { cookie: `access_token=${accessToken}` },
    signal: AbortSignal.timeout(10000)
  })
  const postJson = await postRes.json()
  const post = postJson?.data as SeoPost | undefined

  if (!post) throw createError({ statusCode: 404, message: "文章不存在" })

  return post
}
