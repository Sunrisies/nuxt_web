export interface RequestError {
  data?: { message?: string }
  message?: string
}

export interface ApiResponse<T> {
  code: number
  data: T
}
