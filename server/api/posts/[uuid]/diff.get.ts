import { backendBase } from "../../../utils/backend"

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const postUuid = getRouterParam(event, "uuid")
  const query = getQuery(event)
  const version1 = Number(query.version1)
  const version2 = Number(query.version2)

  if (!postUuid || !version1 || !version2) {
    throw createError({ statusCode: 400, message: "请提供文章 UUID 和两个版本号" })
  }

  const base = backendBase(event)

  // 获取文章信息
  const postRes = await fetch(`${base}/v1/posts/${postUuid}`, {
    headers: { cookie: `access_token=${accessToken}` },
    signal: AbortSignal.timeout(10000)
  })
  const postJson = await postRes.json()
  const post = postJson?.data
  if (!post) throw createError({ statusCode: 404, message: "文章不存在" })

  // 计算两个版本的差异
  // 注意：实际应该从数据库获取两个版本的内容进行对比
  return {
    code: 200,
    data: {
      version1,
      version2,
      diff: {
        title: { before: "", after: "" },
        content: { before: "", after: "" },
        changedFields: []
      }
    }
  }
})
