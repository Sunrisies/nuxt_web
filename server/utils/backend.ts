import type { H3Event } from "h3"

export interface ApiEnvelope<T> {
  code: number
  message?: string
  data: T
}

export function backendBase(event: H3Event): string {
  const config = useRuntimeConfig(event)
  // 兼容现有部署变量；新部署使用仅服务端可见的 NUXT_API_BASE。
  const base = process.env.NUXT_API_BASE || process.env.NUXT_PUBLIC_API_BASE || config.apiBase
  if (!base || !/^https?:\/\//.test(base)) {
    throw createError({ statusCode: 500, statusMessage: "Backend API is not configured" })
  }
  return base.replace(/\/$/, "")
}

export async function backendData<T>(event: H3Event, path: string, query?: Record<string, string | number>, timeout?: number) {
  const started = performance.now()
  try {
    const result = await $fetch<ApiEnvelope<T>>(path, {
      baseURL: backendBase(event),
      dispatcher: backendDispatcher(event),
      query,
      timeout: timeout ?? Number(useRuntimeConfig(event).apiTimeout),
      retry: 0
    })
    if (!result || result.code !== 200) {
      throw createError({
        statusCode: result?.code === 404 ? 404 : 502,
        statusMessage: result?.code === 404 ? "Not Found" : "Invalid backend response"
      })
    }
    return result.data
  } catch (error) {
    const failure = error as { statusCode?: number, status?: number, cause?: { name?: string } }
    const status = failure.statusCode || failure.status
    if (status === 404) throw createError({ statusCode: 404, statusMessage: "Not Found" })
    const timeout = failure.cause?.name === "TimeoutError" || failure.cause?.name === "AbortError"
    throw createError({ statusCode: timeout ? 504 : 502, statusMessage: timeout ? "Backend timed out" : "Backend unavailable" })
  } finally {
    if (!event.handled && !event.node.res.headersSent) appendResponseHeader(event, "Server-Timing", `backend;dur=${(performance.now() - started).toFixed(1)}`)
  }
}
