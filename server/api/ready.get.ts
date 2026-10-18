import { authoritativeRevision } from "../utils/public-content"

export default defineEventHandler(async (event) => {
  const [data] = await Promise.all([
    backendData<unknown[] | { data: unknown[] }>(event, "/v1/posts", { page: 1, limit: 1 }),
    authoritativeRevision(event)
  ])
  if (!Array.isArray(Array.isArray(data) ? data : data?.data)) {
    throw createError({ statusCode: 502, statusMessage: "Invalid backend response" })
  }
  return { status: "ready" }
})
