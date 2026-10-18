export interface ArticleDraft {
  title: string
  summary: string
  markdowncontent: string
  category_id: number | null
  tag_ids: number[]
  cover_image: string
}

export function isArticleImageUrl(value: string): boolean {
  if (!value || /[\s<>]/.test(value)) return false
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\")
  try { return ["http:", "https:"].includes(new URL(value).protocol) } catch { return false }
}

export function articleDraftError(draft: ArticleDraft): string {
  if (!draft.title.trim()) return "请填写文章标题"
  if (draft.title.trim().length > 255) return "文章标题不能超过 255 个字符"
  if (!draft.markdowncontent.trim()) return "请填写文章正文"
  if (!Number.isInteger(draft.category_id) || Number(draft.category_id) <= 0) return "请选择文章分类，没有分类时可先新建"
  if (!draft.tag_ids.length || draft.tag_ids.some(id => !Number.isInteger(id) || id <= 0)) return "请至少选择一个标签，没有标签时可先新建"
  if (draft.summary.length > 500) return "文章摘要不能超过 500 个字符"
  if (draft.cover_image && !isArticleImageUrl(draft.cover_image)) return "请填写有效的封面图片地址，或直接上传图片"
  return ""
}

export function insertArticleImage(source: string, start: number, end: number, url: string, description: string) {
  if (!isArticleImageUrl(url)) throw new Error("图片地址无效")
  const from = Math.max(0, Math.min(source.length, start))
  const to = Math.max(from, Math.min(source.length, end))
  const alt = description.replace(/[[\]\\\r\n]/g, " ").trim() || "图片"
  const escaped = url.replace(/[()\\]/g, character => encodeURIComponent(character).replace(/[()]/g, c => `%${c.charCodeAt(0).toString(16)}`))
  const image = `${from && source[from - 1] !== "\n" ? "\n\n" : ""}![${alt}](${escaped})\n\n`
  return { value: source.slice(0, from) + image + source.slice(to), cursor: from + image.length }
}
