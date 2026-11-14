export interface SyncDetail {
  title: string
  status: "created" | "skipped" | "failed"
  message?: string
}

export interface SyncResult {
  total: number
  created: number
  skipped: number
  failed: number
  details: SyncDetail[]
}
