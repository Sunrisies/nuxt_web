interface PostItem {
  uuid: string
  publish_time?: string
}

interface TagItem {
  name: string
}

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || "/api"

  const routes: Array<{ loc: string, lastmod?: string }> = [
    { loc: "/" },
    { loc: "/about" },
    { loc: "/archives" },
    { loc: "/timeline" },
    { loc: "/navigationBar" },
    { loc: "/blog/1" }
  ]

  try {
    const postsRes = await $fetch<{ code: number, data: PostItem[] }>("/v1/posts?page=1&limit=500", { baseURL: apiBase })
    const posts = Array.isArray(postsRes?.data) ? postsRes.data : []

    for (const post of posts) {
      if (!post?.uuid) continue
      routes.push({
        loc: `/article/${post.uuid}`,
        lastmod: post.publish_time ? new Date(post.publish_time).toISOString() : undefined
      })
    }
  } catch {
    // Keep base routes available even if post fetch fails.
  }

  try {
    const tagsRes = await $fetch<{ code: number, data: TagItem[] }>("/v1/tags/count", { baseURL: apiBase })
    const tags = Array.isArray(tagsRes?.data) ? tagsRes.data : []

    for (const tag of tags) {
      if (!tag?.name) continue
      routes.push({ loc: `/tag/${encodeURIComponent(tag.name)}` })
    }
  } catch {
    // Keep sitemap generation resilient when tag fetch fails.
  }

  return routes
})
