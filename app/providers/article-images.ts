import ipx from "@nuxt/image/runtime/providers/ipx"

// Uploaded media is served by the API, not from Nuxt's public filesystem.
// Keep IPX processing for normal static images and preserve the UI image/zoom component.
export default () => {
  const provider = ipx()
  return {
    ...provider,
    getImage(...args: Parameters<typeof provider.getImage>) {
      const [src] = args
      if (/^\/api\/v1\/users\/default-avatar\.(?:svg|webp)(?:\?v=\d+)?$/.test(src)) return { url: src }
      if (/^\/api\/v1\/posts\/category-cover\/[1-9][0-9]*\.svg$/.test(src)) return { url: src }
      if (/^\/api\/v1\/images\/file\/[a-f0-9-]{36}\.webp$/.test(src)) return { url: src }
      return provider.getImage(...args)
    }
  }
}
