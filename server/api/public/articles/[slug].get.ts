export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug || !/^[\w-]+$/.test(slug)) throw createError({ statusCode: 404, statusMessage: "Article not found" })
  return { code: 200, data: await publicArticle(event, slug) }
})
