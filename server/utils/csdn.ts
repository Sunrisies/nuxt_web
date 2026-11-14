import { createHmac, randomUUID } from "node:crypto"
import type { H3Event } from "h3"

const API_BASE_URL = "https://bizapi.csdn.net"
const APP_KEY = "203803574"
const APP_SECRET = "9znpamsyl2c7cdrr9sas0le9vbc3r6ba"
const SIGNATURE_HEADERS = "x-ca-key,x-ca-nonce"
const ACCEPT_TYPE = "application/json, text/plain, */*"

const PATHS = {
  ARTICLE_LIST: "/blog/phoenix/console/v1/article/list",
  ARTICLE_DETAIL: "/blog-console-api/v3/editor/getArticle",
}

export interface CsdnListItem {
  articleId: string
  title: string
  postTime: string
  viewCount: number
}

function buildSignedRequest(
  cookie: string,
  apiPath: string,
  params: Record<string, string | number>,
) {
  const nonce = randomUUID()
  const url = `${API_BASE_URL}${apiPath}`

  // 签名用：空值只写 key，不写 =
  const signQueryString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => value === "" ? key : `${key}=${value}`)
    .join("&")

  // 请求用：所有参数都带 =
  const requestQueryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&")

  const signatureString = [
    "GET",
    ACCEPT_TYPE,
    "",
    "",
    "",
    `x-ca-key:${APP_KEY}`,
    `x-ca-nonce:${nonce}`,
    `${apiPath}?${signQueryString}`,
  ].join("\n")

  const signature = createHmac("sha256", APP_SECRET).update(signatureString).digest("base64")

  const headers = {
    cookie,
    "Accept": ACCEPT_TYPE,
    "x-ca-signature-headers": SIGNATURE_HEADERS,
    "x-ca-key": APP_KEY,
    "x-ca-nonce": nonce,
    "x-ca-signature": signature,
  }

  const fullUrl = `${url}?${requestQueryString}`
  return { url: fullUrl, headers }
}

export async function fetchCsdnArticleList(cookie: string, page = 1, pageSize = 50): Promise<CsdnListItem[]> {
  const { url, headers } = buildSignedRequest(cookie, PATHS.ARTICLE_LIST, {
    page,
    pageSize,
    status: "all_v3",
  })
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) throw new Error(`CSDN API 请求失败: ${res.status}`)
  const json = await res.json()
  const list = json?.data?.list ?? []
  return list.map((item: { articleId: string, postTime: string, title: string, viewCount?: number }) => ({
    articleId: String(item.articleId),
    postTime: item.postTime,
    title: item.title,
    viewCount: Number(item.viewCount) || 0,
  }))
}

export async function fetchCsdnArticleDetail(cookie: string, id: string) {
  const { url, headers } = buildSignedRequest(cookie, PATHS.ARTICLE_DETAIL, {
    id,
    model_type: "",
  })
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000)
  })
  if (!res.ok) return null
  const json = await res.json()
  return json?.data ?? null
}

export { buildSignedRequest, API_BASE_URL, APP_KEY, APP_SECRET, SIGNATURE_HEADERS, ACCEPT_TYPE, PATHS }
