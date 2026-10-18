import { publicArchive } from "../utils/public-content"

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char] || char)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = String(config.public.siteUrl || "https://blog.sunrise1024.top").replace(/\/$/, "")
  const archive = await publicArchive(event)
  const items = archive.data.slice(0, 50).map(post => {
    const url = `${siteUrl}/article/${encodeURIComponent(post.uuid)}`
    return `<item><title>${escapeXml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(post.description || "")}</description><pubDate>${new Date(post.publish_time).toUTCString()}</pubDate><category>${escapeXml(post.category?.name || "未分类")}</category></item>`
  }).join("")
  setResponseHeader(event, "content-type", "application/rss+xml; charset=utf-8")
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>朝阳的码农札记</title><link>${siteUrl}</link><description>技术文章与开发经验</description><language>zh-CN</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`
})
