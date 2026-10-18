import type { RequestError } from "~/types/api"

export function requestErrorMessage(error: unknown, fallback: string): string {
  const value = error as RequestError
  if (typeof value?.data?.message === "string" && value.data.message) return value.data.message
  if (typeof value?.message === "string" && value.message) return value.message
  return fallback
}
