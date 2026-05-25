export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase).replace(/\/+$/, "")
  const path = event.path.replace(/^\/api\//, "")
  const target = `${apiBase}/${path}`

  return proxyRequest(event, target)
})
