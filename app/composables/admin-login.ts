interface AdminUser {
  id: number
  uuid: string
  user_name: string
}

export async function loginAdmin(credentials: { account: string, password: string, login_type: "password" }) {
  const session = useAdminSession()
  const user = await http<AdminUser>({ url: "/v1/auth/login", method: "POST", body: { ...credentials } })
  if (!user || !Number.isInteger(user.id) || typeof user.uuid !== "string" || !user.uuid || typeof user.user_name !== "string" || !user.user_name) {
    throw createError({ statusCode: 502, message: "登录响应无效，请稍后重试" })
  }
  await session.check({ throwOnForbidden: true })
  if (!session.user.value) throw createError({ statusCode: 401, message: "登录会话未生效" })
  localStorage.removeItem("admin_user")
  return user
}

export function loginErrorMessage(error: unknown): string {
  const value = error as { data?: { message?: unknown }, message?: unknown }
  if (typeof value?.data?.message === "string") return value.data.message
  if (typeof value?.message === "string") return value.message
  return "网络错误，请稍后重试"
}
