import type { PostSummary, IBlog } from "~/types/blog"
import type { MDCParserResult } from "@nuxtjs/mdc"

export type IArticle = IBlog
export interface ArticlePage {
  article: PostSummary
  ast: MDCParserResult
  neighbors: { prev: { uuid: string, title: string } | null, next: { uuid: string, title: string } | null }
  readingMinutes: number
}
