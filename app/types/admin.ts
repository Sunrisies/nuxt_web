export interface AdminNamedItem {
  id: number
  name: string
  created_at: string
}

export interface AdminLink extends AdminNamedItem {
  url: string
  description?: string | null
  icon?: string | null
  icon_url?: string | null
  category?: string
}

export interface AdminPost {
  id: number
  uuid: string
  title: string
  publish_time: string
  views: number
  summary?: string | null
  description?: string | null
  content?: string | null
  markdowncontent?: string | null
  htmlcontent?: string | null
  cover?: string | null
  cover_image?: string | null
  category?: { id: number, name: string } | null
  tags?: { id: number, name: string }[]
  is_publish?: boolean
  featured?: boolean
  is_recommend?: boolean
  is_top?: boolean
  is_hide?: boolean
}

export interface AdminList<T> {
  data: T[]
  pagination: { total: number, limit: number }
}

export type AdminTableItem<T> = T | { original: T }

export interface AdminImage {
  id: number
  url: string
  key: string
  filename: string
  size: number
  human_readable_size: string
  created_at: string
  reference_count: number
  references: { uuid: string, title: string, status: number, body: boolean, cover: boolean }[]
}
