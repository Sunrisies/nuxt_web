// //全局基础URL
const BASEURL: string = "http:://127.0.0.1:3000/api" // 全局后台服务器请求地址
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"
// //定义ts变量类型接口
interface HttpParams<T = any> {
  baseURL?: string // 请求的基本URL，即后台服务器地址，（若服务器请求地址只有一个，可不填）
  url: string // 请求api接口地址
  method?: HttpMethod // 请求方法
  query?: Record<string, any> // 添加查询搜索参数到URL
  body?: T // 请求体
}

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export const http = async <T = any>(obj: HttpParams): Promise<T> => {
  try {
    const response = await $fetch<ApiResponse<T>>(obj.url, {
      baseURL: process.env.NUXT_PUBLIC_API_BASE || BASEURL,
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
