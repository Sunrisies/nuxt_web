import { scoreSeoPost } from "../../utils/seo-score"
import { fetchSeoPost } from "../../utils/seo-post"

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody<{ postId: number }>(event)
  if (!body?.postId) throw createError({ statusCode: 400, message: "请提供文章 ID" })

  const post = await fetchSeoPost(event, accessToken, body.postId)

  // 统一使用确定性评分：与「预计分数」、应用后重新分析的口径完全一致。
  const analysis = scoreSeoPost(post)

  return {
    code: 200,
    data: analysis,
    post: { id: post.id, uuid: post.uuid, title: post.title }
  }
})
