interface SessionUser { id: number, uuid: string, user_name: string }
export function useAdminSession() {
  const toast = useToast()
  const user = useState<SessionUser | null>("admin:session", () => null)
  const loggedIn = computed(() => !!user.value)
  async function check(options: { throwOnForbidden?: boolean } = {}) {
    try {
      user.value = await http<SessionUser>({ url: "/auth/session" })
      return true
    } catch (error) {
      const status = (error as { statusCode?: number, status?: number }).statusCode || (error as { status?: number }).status
      user.value = null
      if (status === 403 && options.throwOnForbidden) throw createError({ statusCode: 403, message: "当前账号没有后台管理权限" })
      if (status === 401 || status === 403) return false
      throw error
    }
  }
  async function logout() {
    const result = await http<{ revoked: boolean }>({ url: "/auth/logout", method: "POST" })
    user.value = null
    localStorage.removeItem("admin_user")
    if (!result?.revoked) toast.add({ title: "已退出当前浏览器，服务端会话撤销暂不可用", color: "warning" })
  }
  return { user, loggedIn, check, logout }
}
