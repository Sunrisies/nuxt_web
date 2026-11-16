import { createEventStream } from "h3"
import { backendBase } from "../../utils/backend"
import { callAIStream, parseAIJson, withJsonInstruction } from "../../utils/ai"

interface OptimizationSuggestions {
  title?: { current: string, suggested: string, reason: string }
  description?: { current: string, suggested: string, reason: string }
  keywords?: { current: string[], suggested: string[], reason: string }
  headings?: { current: string, suggested: string, reason: string }
  contentStructure?: { suggestions: string[], reason: string }
}

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody<{
    postId: number
    analysisResult: any
  }>(event)

  if (!body?.postId || !body?.analysisResult) {
    throw createError({ statusCode: 400, message: "请提供文章 ID 和分析结果" })
  }

  // 先获取文章列表，找到对应的 UUID
  const base = backendBase(event)
  const listRes = await fetch(`${base}/v1/posts?page=1&limit=100`, {
    headers: { cookie: `access_token=${accessToken}` },
    signal: AbortSignal.timeout(10000)
  })
  const listJson = await listRes.json()
  const posts = listJson?.data?.data || []
  const postSummary = posts.find((p: any) => p.id === body.postId)

  if (!postSummary) throw createError({ statusCode: 404, message: "文章不存在" })

  // 获取文章详情
  const postRes = await fetch(`${base}/v1/posts/${postSummary.uuid}`, {
    headers: { cookie: `access_token=${accessToken}` },
    signal: AbortSignal.timeout(10000)
  })
  const postJson = await postRes.json()
  const post = postJson?.data

  if (!post) throw createError({ statusCode: 404, message: "文章不存在" })

  const content = post.markdowncontent || post.content || ""
  const description = post.description || post.summary || ""
  const seo = body.analysisResult.seo

  // 找出得分较低的项目
  const lowScoreItems: string[] = []
  if (seo.title.score < 20) lowScoreItems.push(`标题（当前${seo.title.score}/25分）`)
  if (seo.description.score < 16) lowScoreItems.push(`描述（当前${seo.description.score}/20分）`)
  if (seo.keywords.score < 20) lowScoreItems.push(`关键词密度（当前${seo.keywords.score}/25分，密度${seo.keywords.density}%）`)
  if (seo.headings.score < 12) lowScoreItems.push(`标题结构（当前${seo.headings.score}/15分）`)
  if (seo.contentLength.score < 12) lowScoreItems.push(`内容长度（当前${seo.contentLength.score}/15分，${seo.contentLength.wordCount}字）`)

  const stream = createEventStream(event)
  let closed = false
  stream.onClosed(() => { closed = true })

  const send = (payload: unknown) => {
    if (!closed) stream.push(JSON.stringify(payload))
  }

  // 如果所有项目都得分很高，返回空建议
  if (lowScoreItems.length === 0) {
    void (async () => {
      send({ type: "result", data: { code: 200, data: {}, message: "文章 SEO 优化已经很好，无需优化！" } })
      await stream.close()
    })()
    return stream.send()
  }

  // 调用 AI 生成优化建议
  const messages = [
    {
      role: "system" as const,
      content: `你是专业的 SEO 优化专家。只针对得分较低的项目提供优化建议。

【重要规则】
1. 只针对得分低的项目提供建议
2. 如果建议内容和当前内容相同，不要返回该建议
3. 建议必须有实际的改进

【返回格式】
{
  "title": {"current": "当前标题", "suggested": "建议标题", "reason": "原因"},
  "description": {"current": "当前描述", "suggested": "建议描述", "reason": "原因"},
  "keywords": {"current": ["词1"], "suggested": ["词1","词2"], "reason": "原因"},
  "headings": {"current": "当前结构", "suggested": "建议结构", "reason": "原因"}
}

【可选字段】
- title：标题优化（如果标题得分<20）
- description：描述优化（如果描述得分<16）
- keywords：关键词优化（如果关键词得分<20）
- headings：标题结构优化（如果结构得分<12）

【优化技巧】
- 标题：增加关键词、数字、疑问句，保持30-60字符
- 描述：包含关键词，100-160字符，有号召性用语
- 关键词：建议添加相关关键词，密度控制在1%-3%
- 结构：建议添加H2/H3小标题

只返回JSON，如果某项不需要优化就不要包含在返回中。`
    },
    {
      role: "user" as const,
      content: `文章信息：
标题：${post.title}
描述：${description}
内容长度：${content.length} 字符
标签：${post.tags?.map((t: any) => t.name).join(", ") || "无"}

当前得分低的项目：
${lowScoreItems.join("\n")}

分析结果：
${JSON.stringify(body.analysisResult, null, 2)}

请针对以上得分低的项目提供优化建议。只返回需要优化的项目，不需要优化的项目不要返回。`
    }
  ]

  void (async () => {
    try {
      try {
        const raw = await callAIStream(event, withJsonInstruction(messages), {
          temperature: 0.4,
          maxTokens: 3000,
          onDelta: (text, kind) => send({ type: "delta", text, kind })
        })

        const suggestions = parseAIJson<OptimizationSuggestions>(raw)

        // 过滤掉当前和建议相同的项目
        const filteredSuggestions: OptimizationSuggestions = {}

        if (suggestions.title && suggestions.title.current !== suggestions.title.suggested) {
          filteredSuggestions.title = suggestions.title
        }
        if (suggestions.description && suggestions.description.current !== suggestions.description.suggested) {
          filteredSuggestions.description = suggestions.description
        }
        if (suggestions.keywords) {
          const currentKw = suggestions.keywords.current.sort().join(",")
          const suggestedKw = suggestions.keywords.suggested.sort().join(",")
          if (currentKw !== suggestedKw) {
            filteredSuggestions.keywords = suggestions.keywords
          }
        }
        if (suggestions.headings && suggestions.headings.current !== suggestions.headings.suggested) {
          filteredSuggestions.headings = suggestions.headings
        }
        if (suggestions.contentStructure?.suggestions?.length) {
          filteredSuggestions.contentStructure = suggestions.contentStructure
        }

        send({
          type: "result",
          data: {
            code: 200,
            data: filteredSuggestions,
            message: Object.keys(filteredSuggestions).length === 0 ? "文章 SEO 已经很好，无需优化" : undefined
          }
        })
      } catch (aiError) {
        console.log("[SEO Optimize] AI 生成建议失败:", aiError instanceof Error ? aiError.message : "未知错误")
        send({ type: "error", message: "AI 生成建议失败，请重试" })
      }
    } finally {
      await stream.close()
    }
  })()

  return stream.send()
})
