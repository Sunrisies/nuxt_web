import type { Tag } from "~/types/blog"

export function usePublicTags() {
  return useAsyncData("tags:counts", (_app, { signal }) =>
    http<Tag[]>({ url: "/public/tags", signal })
  )
}
