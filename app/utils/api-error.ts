export function publicPageError(error: unknown) {
  const failure = error as { statusCode?: number, status?: number, data?: { statusCode?: number } }
  const status = failure?.statusCode || failure?.status || failure?.data?.statusCode || 503
  return createError({
    statusCode: status === 404 ? 404 : status === 504 ? 504 : 503,
    statusMessage: status === 404 ? "Not Found" : "Content temporarily unavailable",
    message: status === 404 ? "内容不存在" : "内容暂时无法加载，请稍后重试"
  })
}
