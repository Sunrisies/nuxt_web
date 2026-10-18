export default defineSitemapEventHandler(async (event) => {
  const [archive, tags] = await Promise.all([publicArchive(event), publicTags(event)])
  const routes: Array<{ loc: string, lastmod?: string }> = [
    { loc: "/" }, { loc: "/about" }, { loc: "/archives" },
    { loc: "/timeline" }, { loc: "/navigationBar" }
  ]
  for (let page = 1; page <= Math.max(1, Math.ceil(archive.pagination.total / 9)); page++) {
    routes.push({ loc: `/blog/${page}` })
  }
  for (const post of archive.data) {
    const published = new Date(post.publish_time)
    routes.push({
      loc: `/article/${encodeURIComponent(post.uuid)}`,
      lastmod: Number.isNaN(published.getTime()) ? undefined : published.toISOString()
    })
  }
  for (const tag of tags) routes.push({ loc: `/tag/${encodeURIComponent(tag.name)}` })
  return routes
})
