export default defineEventHandler(async (event) => {
  const origin = getHeader(event, "origin")
  if (!["GET", "HEAD", "OPTIONS"].includes(event.method) && origin) {
    // TLS is terminated by the production reverse proxy. `getRequestURL` can
    // therefore see http while browsers correctly send https in Origin. Match
    // the hostname instead of the scheme, while still rejecting other sites.
    const originHost = (() => { try { return new URL(origin).hostname } catch { return "" } })()
    if (!originHost || originHost !== getRequestURL(event).hostname) {
      throw createError({ statusCode: 403, statusMessage: "Cross-origin mutation denied" })
    }
  }
  const path = getRouterParam(event, "path") || ""
  const query = getRequestURL(event).search
  const timeout = ["images/upload", "upload"].includes(path) ? 60000
    : event.method === "DELETE" && /^(images|uploads)\//.test(path) ? 30000
      : Number(useRuntimeConfig(event).apiTimeout)
  return proxyRequest(event, `${backendBase(event)}/v1/${path}${query}`, {
    fetch: backendFetch(event),
    // Use the socket peer, replacing any forwarding header supplied by a browser.
    // The Rust server accepts this only when this Nuxt host is a trusted proxy.
    headers: { "x-forwarded-for": getRequestIP(event) || "unknown" },
    fetchOptions: { signal: AbortSignal.timeout(timeout) },
    onResponse: async (_event, response) => {
      if (response.ok && !["GET", "HEAD", "OPTIONS"].includes(event.method) && /^(posts|tags|categories|links)(\/|$)/.test(path) && !/^posts\/[^/]+\/view$/.test(path)) {
        const result = await response.clone().json().catch(() => null)
        if (result?.code === 200) await invalidatePublicContent()
      }
    }
  })
})
