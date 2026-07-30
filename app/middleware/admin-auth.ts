export default defineNuxtRouteMiddleware((to) => {
  // 登录页不需要鉴权
  if (to.path === "/admin/login") {
    return
  }

  // /admin → 直接重定向到仪表盘或登录页，避免多余的 layout 切换
  if (to.path === "/admin") {
    if (import.meta.client) {
      const user = localStorage.getItem("admin_user")
      return navigateTo(user ? "/admin/dashboard" : "/admin/login", { replace: true })
    }
    return navigateTo("/admin/login", { replace: true })
  }

  // 客户端环境检查登录状态（后端用 Cookie/Session 鉴权）
  if (import.meta.client) {
    const user = localStorage.getItem("admin_user")
    if (!user) {
      return navigateTo("/admin/login")
    }
  }
})
