export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/admin/login" || import.meta.server) return
  const session = useAdminSession()
  try {
    if (!await session.check()) return navigateTo("/admin/login", { replace: true })
    if (to.path === "/admin") return navigateTo("/admin/dashboard", { replace: true })
  } catch {
    return abortNavigation(createError({ statusCode: 503, message: "登录状态暂时无法验证，请稍后重试" }))
  }
})
