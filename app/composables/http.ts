type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"
interface HttpParams<T = unknown> {
  baseURL?: string
  url: string
  method?: HttpMethod
  query?: Record<string, unknown>
  body?: T
  signal?: AbortSignal
  timeout?: number
}
interface ApiResponse<T> {
  code: number
  message?: string
  data: T
}

export const http = async <T = unknown>(options: HttpParams): Promise<T> => {
  const response = await $fetch<ApiResponse<T>>(options.url, {
    baseURL: options.baseURL || "/api",
    method: options.method,
    query: options.query,
    body: options.body,
    signal: options.signal,
    timeout: options.timeout ?? 10000,
    retry: 0
  })
  if (!response || response.code !== 200) {
    throw createError({
      statusCode: response?.code && response.code >= 400 && response.code <= 599 ? response.code : 502,
      statusMessage: response?.code === 404 ? "Not Found" : "API request failed",
      message: response?.message || "请求失败"
    })
  }
  return response.data
}
