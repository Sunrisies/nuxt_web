import { createEventStream } from "h3"
import { backendBase } from "../../utils/backend"
import { callAIStream, cleanAIText, parseAIJson, withJsonInstruction } from "../../utils/ai"

interface SeoAnalysisResult {
  seo: {
    score: number
    maxScore: number
    title: { score: number, status: string, message: string }
    description: { score: number, status: string, message: string }
    keywords: { score: number, status: string, message: string, density: number, keywords: string[] }
    headings: { score: number, status: string, message: string }
    contentLength: { score: number, status: string, message: string, wordCount: number }
  }
  totalScore: number
}

interface PostData {
  id: number
  uuid: string
  title: string
  description: string
  summary: string
  content: string
  markdowncontent: string
  category: { name: string } | null
  tags: { name: string }[]
}

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token")
  if (!accessToken) throw createError({ statusCode: 401, message: "未登录" })

  const body = await readBody<{ postId: number }>(event)
  if (!body?.postId) throw createError({ statusCode: 400, message: "请提供文章 ID" })

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
  const post = postJson?.data as PostData

  if (!post) throw createError({ statusCode: 404, message: "文章不存在" })

  // 准备文章内容用于分析
  const content = post.markdowncontent || post.content || ""
  const wordCount = content.replace(/\s/g, "").length
  const description = post.description || post.summary || ""

  // 基于规则的分析（AI 不可用时的兜底，固定 100 分制，与前端展示口径一致）
  function ruleBasedAnalysis(): SeoAnalysisResult {
    const maxScores = { title: 25, description: 20, keywords: 25, headings: 15, contentLength: 15 }
    const titleLen = post.title.length
    const keywordPool = [
      ...post.tags.map(t => t.name).filter(Boolean),
      ...["Rust", "Python", "JavaScript", "教程", "指南", "详解", "如何", "什么是"]
    ]
    const hasTitleKeyword = keywordPool.some(k => post.title.includes(k))
    const hasAttraction = /\d|为什么|如何|什么|指南|教程/.test(post.title)

    let titleScore = titleLen >= 10 && titleLen <= 60 ? 15 : titleLen < 10 ? 8 : 10
    if (hasTitleKeyword) titleScore += 5
    if (hasAttraction) titleScore += 5
    titleScore = Math.min(maxScores.title, titleScore)

    const descLen = description.length
    let descScore = 0
    if (descLen > 0) {
      descScore = 10
      if (descLen >= 100 && descLen <= 160) descScore += 6
      else if (descLen >= 50 && descLen < 100) descScore += 3
      if (keywordPool.some(k => description.includes(k))) descScore += 4
      descScore = Math.min(maxScores.description, descScore)
    }

    const densityKeywords = [...new Set(keywordPool)].slice(0, 10)
    const density = wordCount > 0 ? (densityKeywords.join("").length / wordCount) * 100 : 0
    const keywordScore = density >= 1 && density <= 3 ? 25 : (density >= 0.5 && density < 1) || (density > 3 && density <= 5) ? 15 : 5

    const h2Count = (content.match(/^##\s+/gm) || []).length
    const h3Count = (content.match(/^###\s+/gm) || []).length
    let headingsScore = h2Count >= 1 ? 8 : 0
    if (h3Count >= 1 || h2Count >= 3) headingsScore += 4
    if (h2Count >= 2 && h3Count >= 1) headingsScore += 3
    headingsScore = Math.min(maxScores.headings, headingsScore)

    const contentScore = wordCount >= 1000 ? 15 : wordCount >= 500 ? 12 : wordCount >= 300 ? 8 : 4

    const ratioStatus = (score: number, max: number) => score / max >= 0.8 ? "good" : score / max >= 0.5 ? "warning" : "bad"
    const totalScore = titleScore + descScore + keywordScore + headingsScore + contentScore

    return {
      seo: {
        score: totalScore,
        maxScore: 100,
        title: {
          score: titleScore,
          status: ratioStatus(titleScore, maxScores.title),
          message: `标题 ${titleLen} 字符${titleLen < 10 ? "，过短" : titleLen > 60 ? "，过长" : "，长度合适"}；${hasTitleKeyword ? "包含核心关键词" : "建议包含核心关键词"}；${hasAttraction ? "有数字/疑问等吸引力元素" : "建议增加数字或疑问元素"}`
        },
        description: {
          score: descScore,
          status: ratioStatus(descScore, maxScores.description),
          message: descLen === 0
            ? "缺少描述，建议补 100-160 字符的摘要"
            : `描述 ${descLen} 字符${descLen < 50 ? "，过短（建议 100-160 字符）" : descLen < 100 ? "，略短（建议 100-160 字符）" : descLen <= 160 ? "，长度合适" : "，过长（建议 100-160 字符）"}；${keywordPool.some(k => description.includes(k)) ? "包含关键词" : "建议包含关键词"}`
        },
        keywords: {
          score: keywordScore,
          status: ratioStatus(keywordScore, maxScores.keywords),
          message: `关键词密度 ${density.toFixed(2)}%${density < 0.5 ? "，过低" : density < 1 ? "，偏低" : density <= 3 ? "，处于 1%-3% 最佳区间" : density <= 5 ? "，偏高" : "，过高"}`,
          density: parseFloat(density.toFixed(2)),
          keywords: densityKeywords
        },
        headings: {
          score: headingsScore,
          status: ratioStatus(headingsScore, maxScores.headings),
          message: `H2 ${h2Count} 个，H3 ${h3Count} 个${h2Count === 0 ? "，建议至少添加 1 个 H2" : "，结构良好"}`
        },
        contentLength: {
          score: contentScore,
          status: ratioStatus(contentScore, maxScores.contentLength),
          message: `内容 ${wordCount} 字${wordCount < 300 ? "，过短" : wordCount < 500 ? "，偏短" : wordCount < 1000 ? "，建议扩到 1000 字以上" : "，长度良好"}`
        }
      },
      totalScore
    }
  }

  // 校验并补齐 AI 返回的数据
  function normalizeAnalysis(analysis: SeoAnalysisResult, actualWordCount: number): SeoAnalysisResult {
    // totalScore 不强制要求：下面会用各项分数重算，避免模型漏字段就直接回退到规则评分
    if (!analysis.seo || typeof analysis.seo !== "object") {
      throw new Error("AI 返回数据不完整")
    }

    if (!analysis.seo.maxScore) analysis.seo.maxScore = 100

    const clampScore = (value: unknown, maxScore: number) => {
      const num = Number(value)
      return Number.isFinite(num) ? Math.max(0, Math.min(maxScore, Math.round(num))) : 0
    }

    const ensureItem = (item: any, maxScore: number) => {
      const result = item && typeof item === "object" ? item : { score: 0, message: "无数据" }
      result.score = clampScore(result.score, maxScore)
      result.status = result.score / maxScore >= 0.8 ? "good" : result.score / maxScore >= 0.5 ? "warning" : "bad"
      if (!result.message) result.message = ""
      return result
    }

    analysis.seo.title = ensureItem(analysis.seo.title, 25)
    analysis.seo.description = ensureItem(analysis.seo.description, 20)
    analysis.seo.keywords = ensureItem(analysis.seo.keywords, 25)
    analysis.seo.headings = ensureItem(analysis.seo.headings, 15)
    analysis.seo.contentLength = ensureItem(analysis.seo.contentLength, 15)

    analysis.seo.score = analysis.seo.title.score + analysis.seo.description.score + analysis.seo.keywords.score + analysis.seo.headings.score + analysis.seo.contentLength.score
    analysis.totalScore = analysis.seo.score

    if (!analysis.seo.keywords.density) analysis.seo.keywords.density = 0
    if (!analysis.seo.keywords.keywords) analysis.seo.keywords.keywords = []
    if (!analysis.seo.contentLength.wordCount) analysis.seo.contentLength.wordCount = actualWordCount

    // 模型有时会在 message 里带 Markdown 标记，清理掉再返回，避免前端显示 **...**
    for (const item of [
      analysis.seo.title,
      analysis.seo.description,
      analysis.seo.keywords,
      analysis.seo.headings,
      analysis.seo.contentLength
    ]) {
      item.message = cleanAIText(item.message)
    }
    analysis.seo.keywords.keywords = (Array.isArray(analysis.seo.keywords.keywords) ? analysis.seo.keywords.keywords : [])
      .map((keyword: unknown) => cleanAIText(keyword))
      .filter((keyword: string) => keyword.length > 0)
      .slice(0, 20)

    return analysis
  }

  // 尝试调用 AI 分析，失败则使用规则分析
  const messages = [
      {
        role: "system" as const,
        content: `你是专业的 SEO 分析专家。只分析 SEO，不分析 GEO。

【重要说明】
- 文章标题已经是 H1 标签，不需要在内容中查找 H1
- 内容中只需要有 H2/H3 小标题即可

【SEO 评分标准（100分）】
1. 标题优化（25分）：
   - 10-60字符：15分
   - 包含核心关键词：+5分
   - 有吸引力/数字/疑问句：+5分

2. 描述优化（20分）：
   - 有描述：10分
   - 100-160字符：+6分
   - 包含关键词：+4分

3. 关键词密度（25分）：
   - 关键词密度1%-3%：25分
   - 0.5%-1%或3%-5%：15分
   - <0.5%或>5%：5分

4. 标题结构（15分）：
   - 有H2小标题：8分
   - 有H3或多个H2：+4分
   - 结构清晰：+3分

5. 内容长度（15分）：
   - 300-500字：8分
   - 500-1000字：+4分
   - >1000字：+3分

【返回格式】
{
  "seo": {
    "score": 总分(0-100),
    "maxScore": 100,
    "title": {"score": 0-25, "status": "good/warning/bad", "message": "说明"},
    "description": {"score": 0-20, "status": "good/warning/bad", "message": "说明"},
    "keywords": {"score": 0-25, "status": "good/warning/bad", "message": "说明", "density": 数字, "keywords": ["词1"]},
    "headings": {"score": 0-15, "status": "good/warning/bad", "message": "说明"},
    "contentLength": {"score": 0-15, "status": "good/warning/bad", "message": "说明", "wordCount": 数字}
  },
  "totalScore": seo.score
}

status标准：score/max >= 0.8 为 good，>= 0.5 为 warning，否则为 bad。只返回JSON。`
      },
      {
        role: "user" as const,
        content: `请分析这篇文章的 SEO：

标题：${post.title}
描述：${description}
分类：${post.category?.name || "无"}
标签：${post.tags.map(t => t.name).join(", ")}
内容长度：${wordCount} 字符

内容预览（前1500字符）：
${content.substring(0, 1500)}`
      }
  ]

  const stream = createEventStream(event)
  let closed = false
  stream.onClosed(() => { closed = true })

  const send = (payload: unknown) => {
    if (!closed) stream.push(JSON.stringify(payload))
  }

  void (async () => {
    try {
      try {
        const raw = await callAIStream(event, withJsonInstruction(messages), {
          temperature: 0.2,
          maxTokens: 4000,
          onDelta: (text, kind) => send({ type: "delta", text, kind })
        })
        const analysis = normalizeAnalysis(parseAIJson<SeoAnalysisResult>(raw), wordCount)
        send({
          type: "result",
          data: {
            code: 200,
            data: analysis,
            post: { id: post.id, uuid: post.uuid, title: post.title }
          }
        })
      } catch (aiError) {
        console.log("[SEO Analyze] AI 分析失败，使用规则分析:", aiError instanceof Error ? aiError.message : "未知错误")
        send({
          type: "result",
          data: {
            code: 200,
            data: ruleBasedAnalysis(),
            post: { id: post.id, uuid: post.uuid, title: post.title },
            fallback: true,
            fallbackReason: aiError instanceof Error ? aiError.message : "未知错误"
          }
        })
      }
    } finally {
      await stream.close()
    }
  })()

  return stream.send()
})
