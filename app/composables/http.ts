// //全局基础URL
const BASEURL: string = "http://127.0.0.1:3000/api" // 全局后台服务器请求地址
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"
// //定义ts变量类型接口
interface HttpParams<T = unknown> {
  baseURL?: string // 请求的基本URL，即后台服务器地址，（若服务器请求地址只有一个，可不填）
  url: string // 请求api接口地址
  method?: HttpMethod // 请求方法
  query?: Record<string, unknown> // 添加查询搜索参数到URL
  body?: T // 请求体
}

interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export const http = async <T = unknown>(obj: HttpParams): Promise<T> => {
  try {
    const config = useRuntimeConfig()
    // 客户端走 Nuxt 同源代理避免跨域，服务端直连后端 API
    const baseURL = import.meta.client
      ? (obj.baseURL || "/api")
      : (config.public.apiBase || BASEURL)

    // 构造 $fetch 参数，只传非空字段
    const fetchOptions: Record<string, any> = { baseURL }
    if (obj.method) fetchOptions.method = obj.method
    if (obj.body != null) fetchOptions.body = obj.body
    if (obj.query) fetchOptions.params = obj.query

    const response = await $fetch<ApiResponse<T>>(obj.url, {
      ...fetchOptions,
      onRequest: (res) => {
        console.log(res, "请求成功")
      },
      onRequestError: (err) => {
        console.error(err, "请求失败")
        throw err
      },
      onResponse: ({ response }) => {
        console.log(response, "响应成功------")
      },
      onResponseError: (err) => {
        console.error(err, "响应失败")
        throw err
      }
    })

    // 检查响应的 code
    if (response.code === 200) {
      return response.data
    } else {
      throw new Error(response.message || "请求失败")
    }
  } catch (error) {
    console.error("请求错误:", error)
    throw error
  }
}
