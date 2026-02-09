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
  summary: boolean
  is_recommend: boolean
  is_top: boolean
  views: number
  author: string
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
