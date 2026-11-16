import { scoreSeoPost } from "../../utils/seo-score"
import { fetchSeoPost } from "../../utils/seo-post"

interface PreviewChanges {
  title?: string
  summary?: string
  markdowncontent?: string
}

/**
 * 改稿前预估：把变更套在文章副本上，用同一套评分规则算出改后分数。
 * 不写库，纯计算。
 */
export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody<{ postId: number, changes?: PreviewChanges }>(event)
  if (!body?.postId) throw createError({ statusCode: 400, message: "请提供文章 ID" })

  const changes = body.changes || {}
  const post = await fetchSeoPost(event, accessToken, body.postId)

  const before = scoreSeoPost(post)
  const after = scoreSeoPost({
    ...post,
    ...(typeof changes.title === "string" ? { title: changes.title } : {}),
    ...(typeof changes.summary === "string" ? { summary: changes.summary } : {}),
    ...(typeof changes.markdowncontent === "string" ? { markdowncontent: changes.markdowncontent } : {})
  })

  return {
    code: 200,
    data: {
      before,
      after,
      delta: after.totalScore - before.totalScore
    }
  }
})
