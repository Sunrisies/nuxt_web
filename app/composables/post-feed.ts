import type { PostList, PostSummary } from "~/types/blog"

export function usePostFeed(firstPage: Ref<PostList | null | undefined>, query: () => Record<string, string | number>, identity: () => string) {
  const additional = ref<PostSummary[]>([])
  const page = ref(1)
  const loading = ref(false)
  const error = ref(false)
  let controller: AbortController | undefined
  const posts = computed(() => [...(firstPage.value?.data || []), ...additional.value])
  const hasMore = computed(() => posts.value.length < (firstPage.value?.pagination.total || 0))
  watch(identity, () => {
    controller?.abort()
    additional.value = []
    page.value = 1
    loading.value = false
    error.value = false
  })
  onScopeDispose(() => controller?.abort())
  async function loadMore() {
    if (loading.value || !hasMore.value) return
    const key = identity()
    controller = new AbortController()
    loading.value = true
    error.value = false
    try {
      const result = await http<PostList>({ url: "/public/posts", query: { ...query(), page: page.value + 1, limit: 100 }, signal: controller.signal })
      if (key !== identity()) return
      if (!result.data.length) throw new Error("Incomplete post feed")
      const seen = new Set(posts.value.map(post => post.uuid))
      const newPosts = result.data.filter(post => !seen.has(post.uuid))
      if (!newPosts.length) throw new Error("Repeated post feed page")
      additional.value.push(...newPosts)
      page.value++
    } catch {
      if (key === identity()) error.value = true
    } finally {
      if (key === identity()) loading.value = false
    }
  }
  return { posts, hasMore, loading, error, loadMore }
}
