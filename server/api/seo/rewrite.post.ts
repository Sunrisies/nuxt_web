import { callAI } from "../../utils/ai"
import { fetchSeoPost } from "../../utils/seo-post"

const SYSTEM_PROMPT = `你是资深中文技术编辑，擅长在不改变原意的前提下优化文章结构。

请按给定的 SEO 建议改写下面这篇 Markdown 文章，硬性要求：
1. 保留所有代码块、图片、链接、引用、表格和事实信息，不得删减内容、不得编造新内容；
2. 只调整 H2/H3 的层级与措辞、拆分或合并段落、补充少量过渡句，可做轻微润色；
3. 不需要输出解释、说明、前言或后记；
4. 直接输出完整的 Markdown 正文，不要用 \`\`\` 代码围栏包裹整篇文章。`

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody<{ postId: number, suggestions?: string[] }>(event)
  if (!body?.postId) throw createError({ statusCode: 400, message: "请提供文章 ID" })

  const post = await fetchSeoPost(event, accessToken, body.postId)
  const markdown = (post.markdowncontent || post.content || "").trim()
  if (!markdown) throw createError({ statusCode: 400, message: "文章正文为空，无法改写" })

  const suggestions = Array.isArray(body.suggestions)
    ? body.suggestions.filter(item => typeof item === "string" && item.trim()).slice(0, 12)
    : []

  const raw = await callAI(event, [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `优化建议：\n${suggestions.map((item, index) => `${index + 1}. ${item}`).join("\n") || "（无额外建议，仅优化小标题层级与段落结构）"}\n\n原文：\n${markdown}`
    }
  ], { temperature: 0.3, maxTokens: 8000 })

  let markdowncontent = raw.trim()
  const fenced = markdowncontent.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n```$/)
  if (fenced) markdowncontent = fenced[1].trim()

  return {
    code: 200,
    data: { markdowncontent }
  }
})
