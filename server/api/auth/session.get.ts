export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "private, no-store")
  const token = getCookie(event, "access_token")
  if (!token) throw createError({ statusCode: 401 })
  let uuid: string
  try {
    // 此处仅提取查询 ID；JWT 的签名和有效期必须由后端验证。
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString())
    uuid = claims.user_uuid
    if (typeof uuid !== "string" || !/^[\w-]{1,100}$/.test(uuid)) throw new Error("Invalid user")
  } catch { throw createError({ statusCode: 401 }) }
  const response = await backendFetch(event)(`${backendBase(event)}/v1/users/${encodeURIComponent(uuid)}`, {
    headers: { cookie: `access_token=${token}` },
    signal: AbortSignal.timeout(Number(useRuntimeConfig(event).apiTimeout))
  }).catch(() => { throw createError({ statusCode: 503 }) })
  if (!response.ok) throw createError({ statusCode: response.status === 401 || response.status === 403 ? response.status : 503 })
  const result = await response.json().catch(() => { throw createError({ statusCode: 502, message: "Invalid session response" }) })
  if (result?.code === 401 || result?.code === 403) throw createError({ statusCode: result.code })
  const user = result.data
  if (result.code !== 200 || user?.uuid !== uuid || typeof user.user_name !== "string" || !Number.isInteger(user.id)) {
    throw createError({ statusCode: 502, message: "Invalid session response" })
  }
  return { code: 200, data: { id: user.id, uuid: user.uuid, user_name: user.user_name } }
})
