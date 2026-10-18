export interface IBlog {
  id: number
  title: string
  cover: string
  category: {
    id: number
    name: string
  }
  tags: {
    id: number
    name: string
  }[]
  publish_time: string
  is_hide: boolean
  is_publish?: boolean
  summary: boolean
  is_recommend: boolean
  is_top: boolean
  views: number
  author: string
  author_avatar?: string
  content: string
  description: string
  uuid: string
}

export interface Tag {
  id: number
  name: string
  count: number
}
export type warehouseType = [string, number][]

export type PostSummary = Omit<IBlog, "content">
export interface PostList {
  data: PostSummary[]
  pagination: { total: number, limit: number, page: number }
}
