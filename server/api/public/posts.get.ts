export default defineEventHandler(async (event) => {
  const input = getQuery(event)
  const query: Record<string, string | number> = {
    page: Math.min(100000, Math.max(1, Math.floor(Number(input.page)) || 1)),
    limit: Math.min(100, Math.max(1, Math.floor(Number(input.limit)) || 12))
  }
  for (const key of ["tag", "category", "search"]) {
    if (input[key] === undefined) continue
    if (key === "search") {
      if (typeof input[key] !== "string" || input[key].length > 200) {
        throw createError({ statusCode: 400, statusMessage: "Invalid search query" })
      }
      query[key] = input[key].trim()
      continue
    }
    if (typeof input[key] !== "string" || !/^[1-9]\d*$/.test(input[key]) || !Number.isSafeInteger(Number(input[key]))) {
      throw createError({ statusCode: 400, statusMessage: "Invalid filter" })
    }
    query[key] = input[key]
  }
  return { code: 200, data: await publicPosts(event, query) }
})
