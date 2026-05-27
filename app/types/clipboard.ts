export type ClipboardType = 'text' | 'image' | 'file'

export interface ClipboardEntry {
  uuid: string
  type: ClipboardType
  content?: string
  file_url?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  pinned: boolean
  created_at: string
}

export interface ClipboardPagination {
  page: number
  limit: number
  total: number
}

export interface ClipboardListResponse {
  data: ClipboardEntry[]
  pagination: ClipboardPagination
}
