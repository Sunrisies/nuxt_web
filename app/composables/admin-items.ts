import type { AdminList } from "~/types/admin"

export async function allAdminItems<T extends { id: number }>(url: string): Promise<T[]> {
  const items: T[] = []
  const seen = new Set<number>()
  for (let page = 1; page <= 100; page++) {
    const result = await http<AdminList<T>>({ url, query: { page, limit: 100 } })
    if (!Array.isArray(result?.data) || !Number.isInteger(result.pagination?.total) || result.pagination.total < 0) throw new Error("列表响应无效")
    for (const item of result.data) {
      if (!Number.isInteger(item.id) || seen.has(item.id)) throw new Error("列表分页数据发生变化，请重试")
      seen.add(item.id)
      items.push(item)
    }
    if (items.length >= result.pagination.total) return items
    if (!result.data.length) break
  }
  throw new Error("列表数据不完整，请重试")
}
