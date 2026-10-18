export default defineEventHandler(async (event) => {
  const origin = getHeader(event, "origin")
  if (origin) {
    const originHost = (() => { try { return new URL(origin).hostname } catch { return "" } })()
    if (!originHost || originHost !== getRequestURL(event).hostname) throw createError({ statusCode: 403 })
  }
  setHeader(event, "Cache-Control", "private, no-store")
  const token = getCookie(event, "access_token")
  let revoked = true
  if (token) {
    const response = await backendFetch(event)(`${backendBase(event)}/v1/auth/logout`, {
      method: "POST",
      headers: { cookie: `access_token=${token}` },
      signal: AbortSignal.timeout(Number(useRuntimeConfig(event).apiTimeout))
    }).catch(() => { throw createError({ statusCode: 503, message: "注销服务暂不可用，请重试" }) })
    if (response.status === 404 || response.status === 405) {
      // 兼容尚未部署新注销接口的后端，明确返回仅浏览器退出。
      revoked = false
    } else if (response.status !== 401) {
      if (!response.ok) throw createError({ statusCode: 503, message: "注销服务暂不可用，请重试" })
      const result = await response.json().catch(() => null)
      if (result?.code !== 200 || result?.data?.revoked !== true) throw createError({ statusCode: 502, message: "注销响应无效" })
    }
  }
  deleteCookie(event, "access_token", { path: "/", httpOnly: true, sameSite: "strict" })
  return { code: 200, data: { revoked } }
})
