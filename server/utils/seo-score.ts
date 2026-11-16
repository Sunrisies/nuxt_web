/**
 * SEO 评分（100 分制）的单一实现。
 *
 * 分析接口、改稿预览接口都用它计算分数，保证「应用建议前看到的预计分数」
 * 与「应用后重新分析得到的分数」完全一致。
 */

export interface SeoScoreItem {
  score: number
  status: "good" | "warning" | "bad"
  message: string
}

export interface SeoKeywordsItem extends SeoScoreItem {
  density: number
  keywords: string[]
}

export interface SeoContentLengthItem extends SeoScoreItem {
  wordCount: number
}

export interface SeoAnalysisResult {
  seo: {
    score: number
    maxScore: number
    title: SeoScoreItem
    description: SeoScoreItem
    keywords: SeoKeywordsItem
    headings: SeoScoreItem
    contentLength: SeoContentLengthItem
  }
  totalScore: number
}

export interface SeoScorablePost {
  title?: string | null
  summary?: string | null
  description?: string | null
  content?: string | null
  markdowncontent?: string | null
  tags?: { name: string }[] | null
}

const MAX_SCORES = {
  title: 25,
  description: 20,
  keywords: 25,
  headings: 15,
  contentLength: 15
} as const

const GENERIC_KEYWORDS = ["Rust", "Python", "JavaScript", "教程", "指南", "详解", "如何", "什么是"]

function countOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0
  let count = 0
  let index = text.indexOf(keyword)
  while (index !== -1) {
    count++
    index = text.indexOf(keyword, index + keyword.length)
  }
  return count
}

function ratioStatus(score: number, max: number): "good" | "warning" | "bad" {
  const ratio = max > 0 ? score / max : 0
  return ratio >= 0.8 ? "good" : ratio >= 0.5 ? "warning" : "bad"
}

export function scoreSeoPost(post: SeoScorablePost): SeoAnalysisResult {
  const title = post.title || ""
  const description = post.description || post.summary || ""
  const content = post.markdowncontent || post.content || ""
  const wordCount = content.replace(/\s/g, "").length

  const tagNames = Array.isArray(post.tags) ? post.tags.map(tag => tag?.name).filter(Boolean) as string[] : []
  const keywordPool = [...new Set([...tagNames, ...GENERIC_KEYWORDS])]

  const titleLen = title.length
  const hasTitleKeyword = keywordPool.some(keyword => title.includes(keyword))
  const hasAttraction = /\d|为什么|如何|什么|指南|教程/.test(title)

  let titleScore = titleLen >= 10 && titleLen <= 60 ? 15 : titleLen < 10 ? 8 : 10
  if (hasTitleKeyword) titleScore += 5
  if (hasAttraction) titleScore += 5
  titleScore = Math.min(MAX_SCORES.title, titleScore)

  const descLen = description.length
  let descScore = 0
  if (descLen > 0) {
    descScore = 10
    if (descLen >= 100 && descLen <= 160) descScore += 6
    else if (descLen >= 50 && descLen < 100) descScore += 3
    if (keywordPool.some(keyword => description.includes(keyword))) descScore += 4
    descScore = Math.min(MAX_SCORES.description, descScore)
  }

  const lowerContent = content.toLowerCase()
  const occurrences = keywordPool
    .map(keyword => ({ keyword, count: countOccurrences(lowerContent, keyword.toLowerCase()) }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count || b.keyword.length - a.keyword.length)
  const densityKeywords = occurrences.slice(0, 10)
  const keywordChars = densityKeywords.reduce((sum, item) => sum + item.keyword.length * item.count, 0)
  const density = wordCount > 0 ? (keywordChars / wordCount) * 100 : 0
  const keywordScore = density >= 1 && density <= 3
    ? 25
    : (density >= 0.5 && density < 1) || (density > 3 && density <= 5) ? 15 : 5

  const h2Count = (content.match(/^##\s+/gm) || []).length
  const h3Count = (content.match(/^###\s+/gm) || []).length
  let headingsScore = h2Count >= 1 ? 8 : 0
  if (h3Count >= 1 || h2Count >= 3) headingsScore += 4
  if (h2Count >= 2 && h3Count >= 1) headingsScore += 3
  headingsScore = Math.min(MAX_SCORES.headings, headingsScore)

  const contentScore = wordCount >= 1000 ? 15 : wordCount >= 500 ? 12 : wordCount >= 300 ? 8 : 4

  const totalScore = titleScore + descScore + keywordScore + headingsScore + contentScore

  return {
    seo: {
      score: totalScore,
      maxScore: 100,
      title: {
        score: titleScore,
        status: ratioStatus(titleScore, MAX_SCORES.title),
        message: `标题 ${titleLen} 字符${titleLen < 10 ? "，过短" : titleLen > 60 ? "，过长" : "，长度合适"}；${hasTitleKeyword ? "包含核心关键词" : "建议包含核心关键词"}；${hasAttraction ? "有数字/疑问等吸引力元素" : "建议增加数字或疑问元素"}`
      },
      description: {
        score: descScore,
        status: ratioStatus(descScore, MAX_SCORES.description),
        message: descLen === 0
          ? "缺少描述，建议补 100-160 字符的摘要"
          : `描述 ${descLen} 字符${descLen < 50 ? "，过短（建议 100-160 字符）" : descLen < 100 ? "，略短（建议 100-160 字符）" : descLen <= 160 ? "，长度合适" : "，过长（建议 100-160 字符）"}；${keywordPool.some(keyword => description.includes(keyword)) ? "包含关键词" : "建议包含关键词"}`
      },
      keywords: {
        score: keywordScore,
        status: ratioStatus(keywordScore, MAX_SCORES.keywords),
        message: `关键词密度 ${density.toFixed(2)}%${density < 0.5 ? "，过低" : density < 1 ? "，偏低" : density <= 3 ? "，处于 1%-3% 最佳区间" : density <= 5 ? "，偏高" : "，过高"}`,
        density: parseFloat(density.toFixed(2)),
        keywords: densityKeywords.length ? densityKeywords.map(item => item.keyword) : keywordPool.slice(0, 8)
      },
      headings: {
        score: headingsScore,
        status: ratioStatus(headingsScore, MAX_SCORES.headings),
        message: `H2 ${h2Count} 个，H3 ${h3Count} 个${h2Count === 0 ? "，建议至少添加 1 个 H2" : "，结构良好"}`
      },
      contentLength: {
        score: contentScore,
        status: ratioStatus(contentScore, MAX_SCORES.contentLength),
        message: `内容 ${wordCount} 字${wordCount < 300 ? "，过短" : wordCount < 500 ? "，偏短" : wordCount < 1000 ? "，建议扩到 1000 字以上" : "，长度良好"}`
      }
    },
    totalScore
  }
}
