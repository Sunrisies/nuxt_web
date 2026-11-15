import { backendBase } from "../../utils/backend"
import { callAIJSON } from "../../utils/ai"

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

  // 基于规则的分析（备用方案）
  function ruleBasedAnalysis(): SeoAnalysisResult {
    // SEO 分析 - 只分析 SEO，不包含 GEO
    const titleLength = post.title.length
    // 标题优化：10-60字符得10分，包含关键词+3分，有吸引力+2分
    let titleScore = titleLength >= 10 && titleLength <= 60 ? 10 : titleLength < 10 ? 5 : 7
    const titleKeywords = ["Rust", "Python", "JavaScript", "教程", "指南", "详解", "如何", "什么是"]
    if (titleKeywords.some(kw => post.title.includes(kw))) titleScore += 3
    if (/\d|为什么|如何|什么|指南|教程/.test(post.title)) titleScore += 2
    titleScore = Math.min(15, titleScore)

    // 描述优化：有描述5分，100-160字符+3分，包含关键词+2分
    const descLength = description.length
    let descScore = descLength > 0 ? 5 : 0
    if (descLength >= 100 && descLength <= 160) descScore += 3
    else if (descLength >= 50 && descLength < 100) descScore += 2
    if (titleKeywords.some(kw => description.includes(kw))) descScore += 2
    descScore = Math.min(10, descScore)

    // 关键词密度：1%-3%得15分
    const keywords = [
      ...post.title.split(/\s+/).filter(w => w.length > 2),
      ...post.tags.map(t => t.name)
    ].slice(0, 10)
    const keywordDensity = wordCount > 0 ? ((keywords.join(" ").length / wordCount) * 100) : 0
    let keywordScore = 5
    if (keywordDensity >= 1 && keywordDensity <= 3) keywordScore = 15
    else if (keywordDensity >= 0.5 && keywordDensity < 1) keywordScore = 10
    else if (keywordDensity > 3 && keywordDensity <= 5) keywordScore = 10
    else if (keywordDensity < 0.5 || keywordDensity > 5) keywordScore = 5

    // 标题标签：文章标题就是H1，内容中有H2/H3即可
    const h2Count = (content.match(/^##\s+/gm) || []).length
    const h3Count = (content.match(/^###\s+/gm) || []).length
    let headingsScore = 5 // 有文章标题作为H1
    if (h2Count >= 1) headingsScore += 3
    if (h3Count >= 1 || h2Count >= 3) headingsScore += 2
    headingsScore = Math.min(10, headingsScore)

    // 内容长度
    const contentScore = wordCount >= 1000 ? 10 : wordCount >= 500 ? 8 : wordCount >= 300 ? 5 : 2

    const seoScore = titleScore + descScore + keywordScore + headingsScore + contentScore
    const totalScore = seoScore // 不再包含 GEO

    return {
      seo: {
        score: seoScore,
        maxScore: 60,
        title: {
          score: titleScore,
          status: titleScore >= 12 ? "good" : titleScore >= 8 ? "warning" : "bad",
          message: `标题长度 ${titleLength} 字符${titleLength < 10 ? "，过短" : titleLength > 60 ? "，过长" : "，长度合适"}`
        },
        description: {
          score: descScore,
          status: descScore >= 8 ? "good" : descScore >= 5 ? "warning" : "bad",
          message: descLength === 0 ? "缺少描述" : `描述长度 ${descLength} 字符${descLength < 50 ? "，过短" : descLength > 160 ? "，过长" : "，长度合适"}`
        },
        keywords: {
          score: keywordScore,
          status: keywordScore >= 12 ? "good" : keywordScore >= 8 ? "warning" : "bad",
          message: `关键词密度 ${keywordDensity.toFixed(2)}%${keywordDensity < 1 ? "，偏低" : keywordDensity > 3 ? "，偏高" : "，适中"}`,
          density: parseFloat(keywordDensity.toFixed(2)),
          keywords
        },
        headings: {
          score: headingsScore,
          status: headingsScore >= 8 ? "good" : headingsScore >= 5 ? "warning" : "bad",
          message: `文章标题作为 H1，${h2Count} 个 H2，${h3Count} 个 H3${h2Count === 0 ? "，建议添加小标题" : "，结构良好"}`
        },
        contentLength: {
          score: contentScore,
          status: contentScore >= 8 ? "good" : contentScore >= 5 ? "warning" : "bad",
          message: `内容 ${wordCount} 字${wordCount < 300 ? "，过短" : wordCount < 1000 ? "，可以更长" : "，长度良好"}`,
          wordCount
        }
      },
      totalScore
    }
  }

  // 尝试调用 AI 分析，失败则使用规则分析
  let analysis: SeoAnalysisResult
  try {
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

    analysis = await callAIJSON<SeoAnalysisResult>(event, messages, {
      temperature: 0.2,
      maxTokens: 3000
    })

    // 验证和修复 AI 返回的数据
    if (!analysis.seo || typeof analysis.totalScore !== "number") {
      throw new Error("AI 返回数据不完整")
    }

    // 确保 maxScore 存在
    if (!analysis.seo.maxScore) analysis.seo.maxScore = 100

    // 确保所有子项存在
    const ensureItem = (item: any, maxScore: number) => {
      if (!item) return { score: 0, status: "bad", message: "无数据" }
      if (!item.score && item.score !== 0) item.score = 0
      if (!item.status) {
        const ratio = item.score / maxScore
        item.status = ratio >= 0.8 ? "good" : ratio >= 0.5 ? "warning" : "bad"
      }
      if (!item.message) item.message = ""
      return item
    }

    analysis.seo.title = ensureItem(analysis.seo.title, 25)
    analysis.seo.description = ensureItem(analysis.seo.description, 20)
    analysis.seo.keywords = ensureItem(analysis.seo.keywords, 25)
    analysis.seo.headings = ensureItem(analysis.seo.headings, 15)
    analysis.seo.contentLength = ensureItem(analysis.seo.contentLength, 15)

    // 重新计算总分，确保一致性
    analysis.seo.score = analysis.seo.title.score + analysis.seo.description.score + analysis.seo.keywords.score + analysis.seo.headings.score + analysis.seo.contentLength.score
    analysis.totalScore = analysis.seo.score

    // 确保 keywords 字段存在
    if (!analysis.seo.keywords.density) analysis.seo.keywords.density = 0
    if (!analysis.seo.keywords.keywords) analysis.seo.keywords.keywords = []
    if (!analysis.seo.contentLength.wordCount) analysis.seo.contentLength.wordCount = wordCount
  } catch (aiError) {
    console.log("[SEO Analyze] AI 分析失败，使用规则分析:", aiError instanceof Error ? aiError.message : "未知错误")
    analysis = ruleBasedAnalysis()
  }

  return {
    code: 200,
    data: analysis,
    post: {
      id: post.id,
      uuid: post.uuid,
      title: post.title
    }
  }
})
