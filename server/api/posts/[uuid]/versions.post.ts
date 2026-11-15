import { backendBase } from "../../../utils/backend"

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const postUuid = getRouterParam(event, "uuid")
  if (!postUuid) throw createError({ statusCode: 400, message: "请提供文章 UUID" })

  const base = backendBase(event)

  // 获取文章当前内容
  const postRes = await fetch(`${base}/v1/posts/${postUuid}`, {
    headers: { cookie: `access_token=${accessToken}` },
    signal: AbortSignal.timeout(10000)
  })
  const postJson = await postRes.json()
  const post = postJson?.data
  if (!post) throw createError({ statusCode: 404, message: "文章不存在" })

  const body = await readBody<{
    changeType?: string
    changedFields?: string[]
    seoScore?: number
    geoScore?: number
  }>(event)

  // 保存版本到数据库
  return {
    code: 200,
    data: {
      message: "版本保存成功",
      version: {
        postId: post.id,
        title: post.title,
        changeType: body?.changeType || "manual",
        changedFields: body?.changedFields || [],
        seoScore: body?.seoScore,
        geoScore: body?.geoScore,
        createdAt: new Date().toISOString()
      }
    }
  }
})
